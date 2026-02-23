/**
 * VirtualKeyboard - On-screen keyboard for kiosk text input
 * 
 * A simple virtual QWERTY keyboard for touchscreen input.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Delete, CornerDownLeft, ArrowBigUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onEnter?: () => void;
  className?: string;
}

const KEYBOARD_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export function VirtualKeyboard({
  onKeyPress,
  onBackspace,
  onEnter,
  className,
}: VirtualKeyboardProps) {
  const [isUpperCase, setIsUpperCase] = useState(true);

  const handleKeyPress = (key: string) => {
    const outputKey = isUpperCase ? key.toUpperCase() : key.toLowerCase();
    onKeyPress(outputKey);
    // Optional: lower case after first key press
    // setIsUpperCase(false);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Row 1 - Numbers */}
      <div className="flex justify-center gap-1">
        {KEYBOARD_ROWS[0].map((key) => (
          <Button
            key={key}
            variant="outline"
            className="w-12 h-12 text-lg font-bold p-0"
            onClick={() => handleKeyPress(key)}
          >
            {key}
          </Button>
        ))}
      </div>

      {/* Row 2 - QWERTY */}
      <div className="flex justify-center gap-1">
        {KEYBOARD_ROWS[1].map((key) => (
          <Button
            key={key}
            variant="outline"
            className="w-12 h-12 text-lg font-bold p-0"
            onClick={() => handleKeyPress(key)}
          >
            {isUpperCase ? key : key.toLowerCase()}
          </Button>
        ))}
      </div>

      {/* Row 3 - ASDF */}
      <div className="flex justify-center gap-1">
        {KEYBOARD_ROWS[2].map((key) => (
          <Button
            key={key}
            variant="outline"
            className="w-12 h-12 text-lg font-bold p-0"
            onClick={() => handleKeyPress(key)}
          >
            {isUpperCase ? key : key.toLowerCase()}
          </Button>
        ))}
      </div>

      {/* Row 4 - ZXCV with Shift and Backspace */}
      <div className="flex justify-center gap-1">
        <Button
          variant="outline"
          className={cn(
            "w-16 h-12 text-lg font-bold p-0",
            isUpperCase && "bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
          )}
          onClick={() => setIsUpperCase(!isUpperCase)}
        >
          <ArrowBigUp className="w-5 h-5" />
        </Button>
        {KEYBOARD_ROWS[3].map((key) => (
          <Button
            key={key}
            variant="outline"
            className="w-12 h-12 text-lg font-bold p-0"
            onClick={() => handleKeyPress(key)}
          >
            {isUpperCase ? key : key.toLowerCase()}
          </Button>
        ))}
        <Button
          variant="outline"
          className="w-16 h-12 text-lg font-bold p-0"
          onClick={onBackspace}
        >
          <Delete className="w-5 h-5" />
        </Button>
      </div>

      {/* Row 5 - Space and special keys */}
      <div className="flex justify-center gap-1">
        <Button
          variant="outline"
          className="w-80 h-12 text-lg font-bold"
          onClick={() => onKeyPress(' ')}
        >
          Espaço
        </Button>
        {onEnter && (
          <Button
            variant="outline"
            className="w-24 h-12 text-lg font-bold bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
            onClick={onEnter}
          >
            <CornerDownLeft className="w-5 h-5 mr-1" />
            OK
          </Button>
        )}
      </div>
    </div>
  );
}
