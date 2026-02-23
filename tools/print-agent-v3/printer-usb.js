/**
 * USB Printer Driver
 * 
 * Direct USB printing using Windows API via @pdftoprinter/printer
 * or fallback to system commands.
 * 
 * This module handles the low-level USB communication with thermal printers.
 */

const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class USBPrinter {
  constructor() {
    this.printerLib = null;
    this.initNativeLib();
  }

  /**
   * Try to initialize native printer library
   */
  initNativeLib() {
    try {
      // Try to load native Windows printer library
      this.printerLib = require('@pdftoprinter/printer');
      console.log('[USBPrinter] Native printer library loaded');
    } catch (e) {
      try {
        // Alternative library
        this.printerLib = require('@pdftoprinter/printer');
      } catch (e2) {
        console.log('[USBPrinter] No native library, using system commands');
        this.printerLib = null;
      }
    }
  }

  /**
   * List available USB printers
   */
  async listPrinters() {
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        exec('wmic printer get name,portname,status', { encoding: 'utf8' }, (error, stdout) => {
          if (error) {
            console.error('[USBPrinter] Error listing printers:', error);
            resolve([]);
            return;
          }

          const lines = stdout.split('\n').slice(1);
          const printers = [];

          for (const line of lines) {
            const parts = line.trim().split(/\s{2,}/);
            if (parts[0] && parts[0].length > 0) {
              printers.push({
                name: parts[0].trim(),
                port: parts[1] ? parts[1].trim() : '',
                status: parts[2] ? parts[2].trim() : 'Unknown'
              });
            }
          }

          resolve(printers);
        });
      } else if (process.platform === 'darwin') {
        exec('lpstat -p -d', (error, stdout) => {
          if (error) {
            resolve([]);
            return;
          }
          const printers = stdout
            .split('\n')
            .filter(line => line.startsWith('printer'))
            .map(line => {
              const name = line.split(' ')[1];
              return { name, port: '', status: 'Ready' };
            });
          resolve(printers);
        });
      } else {
        exec('lpstat -a', (error, stdout) => {
          if (error) {
            resolve([]);
            return;
          }
          const printers = stdout
            .split('\n')
            .map(line => {
              const name = line.split(' ')[0];
              return name ? { name, port: '', status: 'Ready' } : null;
            })
            .filter(Boolean);
          resolve(printers);
        });
      }
    });
  }

  /**
   * Print raw data to USB printer
   * @param {string} printerName - Windows printer name
   * @param {Buffer} data - Raw ESC/POS data
   */
  async printRaw(printerName, data) {
    console.log(`[USBPrinter] Sending ${data.length} bytes to "${printerName}"`);

    // Method 1: Direct Windows API (if library available)
    if (this.printerLib && process.platform === 'win32') {
      try {
        return await this.printViaNativeApi(printerName, data);
      } catch (e) {
        console.error('[USBPrinter] Native API failed:', e.message);
        // Fall through to system command
      }
    }

    // Method 2: Windows RAW print via copy /b to shared printer
    if (process.platform === 'win32') {
      return await this.printViaWindowsCopy(printerName, data);
    }

    // Method 3: Unix lpr
    return await this.printViaLpr(printerName, data);
  }

  /**
   * Print via native Windows API
   */
  async printViaNativeApi(printerName, data) {
    return new Promise((resolve, reject) => {
      this.printerLib.printDirect({
        data,
        printer: printerName,
        type: 'RAW',
        success: (jobId) => {
          console.log(`[USBPrinter] Native API success, job ID: ${jobId}`);
          resolve({ success: true, jobId });
        },
        error: (err) => {
          reject(new Error(err));
        }
      });
    });
  }

  /**
   * Print via Windows copy /b command
   */
  async printViaWindowsCopy(printerName, data) {
    const tempFile = path.join(os.tmpdir(), `zoopi-print-${Date.now()}.bin`);
    
    try {
      // Write binary data to temp file
      fs.writeFileSync(tempFile, data);

      // Try different printer path formats
      const printerPaths = [
        `\\\\localhost\\${printerName}`,
        `\\\\%COMPUTERNAME%\\${printerName}`,
        `\\\\127.0.0.1\\${printerName}`,
        `\\\\${os.hostname()}\\${printerName}`
      ];

      let lastError = null;

      for (const printerPath of printerPaths) {
        try {
          // Use copy /b for binary data
          const command = `copy /b "${tempFile}" "${printerPath}"`;
          console.log(`[USBPrinter] Trying: ${command}`);
          
          execSync(command, { 
            encoding: 'utf8',
            timeout: 10000,
            windowsHide: true
          });

          console.log(`[USBPrinter] Success via copy /b`);
          return { success: true };

        } catch (e) {
          lastError = e;
          console.log(`[USBPrinter] Path "${printerPath}" failed: ${e.message}`);
          continue;
        }
      }

      // If copy /b fails, try print command
      try {
        const printCommand = `print /d:"${printerName}" "${tempFile}"`;
        console.log(`[USBPrinter] Trying print command: ${printCommand}`);
        
        execSync(printCommand, {
          encoding: 'utf8',
          timeout: 10000,
          windowsHide: true
        });

        console.log(`[USBPrinter] Success via print command`);
        return { success: true };

      } catch (e) {
        console.log(`[USBPrinter] Print command failed: ${e.message}`);
      }

      // Try PowerShell raw printing
      try {
        const psCommand = `
          $printerName = "${printerName.replace(/"/g, '`"')}"
          $data = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '\\\\')}")
          $job = Start-Job -ScriptBlock {
            param($printer, $bytes)
            Add-Type -TypeDefinition @"
              using System;
              using System.Runtime.InteropServices;
              public class RawPrinter {
                [DllImport("winspool.Drv", EntryPoint = "OpenPrinterW", SetLastError = true)]
                public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
                [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true)]
                public static extern bool ClosePrinter(IntPtr hPrinter);
                [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterW", SetLastError = true)]
                public static extern int StartDocPrinter(IntPtr hPrinter, int level, ref DOC_INFO_1 di1);
                [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
                public static extern bool EndDocPrinter(IntPtr hPrinter);
                [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
                public static extern bool StartPagePrinter(IntPtr hPrinter);
                [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
                public static extern bool EndPagePrinter(IntPtr hPrinter);
                [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true)]
                public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
                [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
                public struct DOC_INFO_1 {
                  public string pDocName;
                  public string pOutputFile;
                  public string pDatatype;
                }
              }
"@
            $hPrinter = [IntPtr]::Zero
            if ([RawPrinter]::OpenPrinter($printer, [ref]$hPrinter, [IntPtr]::Zero)) {
              $di = New-Object RawPrinter+DOC_INFO_1
              $di.pDocName = "Zoopi Receipt"
              $di.pDatatype = "RAW"
              if ([RawPrinter]::StartDocPrinter($hPrinter, 1, [ref]$di) -ne 0) {
                [RawPrinter]::StartPagePrinter($hPrinter)
                $ptr = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
                [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $ptr, $bytes.Length)
                $written = 0
                [RawPrinter]::WritePrinter($hPrinter, $ptr, $bytes.Length, [ref]$written)
                [Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)
                [RawPrinter]::EndPagePrinter($hPrinter)
                [RawPrinter]::EndDocPrinter($hPrinter)
              }
              [RawPrinter]::ClosePrinter($hPrinter)
            }
          } -ArgumentList $printerName, $data
          $job | Wait-Job -Timeout 10 | Remove-Job -Force
        `;

        execSync(`powershell -ExecutionPolicy Bypass -Command "${psCommand.replace(/\n/g, ' ')}"`, {
          encoding: 'utf8',
          timeout: 15000,
          windowsHide: true
        });

        console.log(`[USBPrinter] Success via PowerShell RAW API`);
        return { success: true };

      } catch (e) {
        console.log(`[USBPrinter] PowerShell failed: ${e.message}`);
      }

      throw lastError || new Error('All print methods failed');

    } finally {
      // Cleanup temp file
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Print via Unix lpr
   */
  async printViaLpr(printerName, data) {
    const tempFile = path.join(os.tmpdir(), `zoopi-print-${Date.now()}.bin`);
    
    try {
      fs.writeFileSync(tempFile, data);

      return new Promise((resolve, reject) => {
        exec(`lpr -P "${printerName}" -o raw "${tempFile}"`, (error) => {
          try { fs.unlinkSync(tempFile); } catch (e) { /* ignore */ }

          if (error) {
            reject(error);
          } else {
            resolve({ success: true });
          }
        });
      });
    } catch (e) {
      try { fs.unlinkSync(tempFile); } catch (e2) { /* ignore */ }
      throw e;
    }
  }
}

module.exports = { USBPrinter };
