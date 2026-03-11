// ────────────────────────────────────────────────────────────────
// FILE: src/pages/settings/Profile.tsx
// ────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProfileLogic } from "@/modules/profiles/hooks/use-profile-logic";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Shield, Loader2, Save, Eye, EyeOff, Wand2, Check, X as XIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFormError } from "@/hooks/useFormError";

// ── Utilitários de Senha ─────────────────────────────────────────

interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  barColor: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "", color: "", barColor: "" };

  let score = 0;
  if (password.length >= 6)  score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Normaliza para 1-4
  const normalized = Math.min(4, Math.max(1, score)) as 1 | 2 | 3 | 4;

  const map: Record<1 | 2 | 3 | 4, Omit<PasswordStrength, "score">> = {
    1: { label: "Muito fraca",  color: "text-red-500",    barColor: "#ef4444" },
    2: { label: "Fraca",        color: "text-orange-500", barColor: "#f97316" },
    3: { label: "Boa",          color: "text-yellow-500", barColor: "#eab308" },
    4: { label: "Forte",        color: "text-green-500",  barColor: "#22c55e" },
  };

  return { score: normalized, ...map[normalized] };
}

function generateStrongPassword(): string {
  const upper  = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower  = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "@#$%&*!";
  const all = upper + lower + digits + special;

  // Garante pelo menos um de cada categoria
  let pwd =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)];

  for (let i = 0; i < 8; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  // Embaralha
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Componente Principal ─────────────────────────────────────────

const ProfileSettings = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("account");

  const {
    profile,
    isLoading,
    updateProfile,
    isUpdatingProfile,
    updatePassword,
    isUpdatingPassword,
    updateEmail,
    isUpdatingEmail,
  } = useProfileLogic();

  const { hasError, handleInputChange, shouldTabGlow } = useFormError({
    activeTab,
    onTabChange: setActiveTab,
  });

  // ── Estado: Dados Pessoais ───────────────────────────────────────
  const [personalData, setPersonalData] = useState({ full_name: "", phone: "" });

  // ── Estado: Email ────────────────────────────────────────────────
  const [emailData, setEmailData]   = useState({ email: "" });
  const [emailError, setEmailError] = useState<string | null>(null);

  // ── Estado: Senha ────────────────────────────────────────────────
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showOld,     setShowOld]     = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const strength = getPasswordStrength(passwordData.newPassword);

  // ── Preenche dados do perfil quando carrega ──────────────────────
  useEffect(() => {
    if (profile) {
      setPersonalData({ full_name: profile.full_name || "", phone: profile.phone || "" });
      setEmailData({ email: profile.user?.email || "" });
    }
  }, [profile]);

  // ── Handlers: Email ──────────────────────────────────────────────
  const handleEmailChange = (value: string) => {
    setEmailData({ email: value });
    handleInputChange();
    if (emailError) setEmailError(null);
  };

  const handleSaveEmail = () => {
    if (!emailData.email) {
      setEmailError("O e-mail não pode estar vazio.");
      return;
    }
    if (!isValidEmail(emailData.email)) {
      setEmailError("Digite um e-mail válido.");
      return;
    }
    if (emailData.email === profile?.user?.email) {
      setEmailError("O novo e-mail é igual ao atual.");
      return;
    }
    setEmailError(null);
    updateEmail(emailData);
  };

  

  // ── Handlers: Senha ──────────────────────────────────────────────
  const handlePasswordFieldChange = useCallback((field: keyof typeof passwordData, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    handleInputChange();
    if (confirmError) setConfirmError(null);
  }, [handleInputChange, confirmError]);

  const handleGeneratePassword = () => {
    const generated = generateStrongPassword();
    setPasswordData((prev) => ({
      ...prev,
      newPassword: generated,
      confirmPassword: generated,
    }));
    setShowNew(true);
    setShowConfirm(true);
    setConfirmError(null);
    handleInputChange();
  };

  const handleSavePassword = () => {
    if (!passwordData.oldPassword) {
      setConfirmError("Digite sua senha atual.");
      return;
    }
    if (!passwordData.newPassword) {
      setConfirmError("Digite a nova senha.");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setConfirmError("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setConfirmError("A confirmação não coincide com a nova senha.");
      return;
    }
    if (passwordData.newPassword === passwordData.oldPassword) {
      setConfirmError("A nova senha deve ser diferente da senha atual.");
      return;
    }
    setConfirmError(null);
    updatePassword(passwordData);
  };

  const handleAvatarUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["profile-me"] });
  };

  // Botão de senha só fica ativo quando os campos mínimos estão preenchidos
  const canSavePassword =
    !!passwordData.oldPassword &&
    !!passwordData.newPassword &&
    !!passwordData.confirmPassword &&
    !isUpdatingPassword;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col gap-4 max-w-5xl mx-auto w-full">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-card/40 border border-white/5 p-1 rounded-xl w-fit shrink-0">
            <TabsTrigger
              value="account"
              data-error={shouldTabGlow("account") ? "true" : undefined}
              className="rounded-lg px-6 py-2 font-bold uppercase text-[10px] tracking-widest transition-all"
            >
              <User className="w-3 h-3 mr-1.5" /> Dados Pessoais
            </TabsTrigger>
            <TabsTrigger
              value="security"
              data-error={shouldTabGlow("security") ? "true" : undefined}
              className="rounded-lg px-6 py-2 font-bold uppercase text-[10px] tracking-widest transition-all"
            >
              <Shield className="w-3 h-3 mr-1.5" /> Segurança
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 mt-4">
            <AnimatePresence mode="wait">

              {/* ── ABA: DADOS PESSOAIS ── */}
              {activeTab === "account" ? (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-12 gap-4 h-full"
                >
                  {/* Avatar */}
                  <div className="col-span-12 lg:col-span-4">
                    <Card className="glass-card border-white/5 h-full">
                      <CardContent className="p-6 flex flex-col items-center gap-4 h-full justify-center">
                        <AvatarUpload
                          currentAvatar={profile?.avatar_url}
                          fullName={profile?.full_name ?? undefined}
                          onUploadSuccess={handleAvatarUploadSuccess}
                        />
                        <div className="text-center">
                          <p className="font-black text-sm tracking-tight">{profile?.full_name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{profile?.user?.email}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
                    {/* Informações Pessoais */}
                    <Card className="glass-card border-white/5">
                      <CardHeader className="pb-3 pt-5 px-6">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                          Informações Pessoais
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-6 pb-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase text-primary">Nome Completo</Label>
                            <Input
                              name="full_name"
                              id="full_name"
                              className={`h-10 bg-background/50 font-medium rounded-xl transition-all ${
                                hasError("full_name") ? "border-red-500 ring-1 ring-red-500/50 animate-shake" : ""
                              }`}
                              value={personalData.full_name}
                              onChange={(e) => {
                                setPersonalData({ ...personalData, full_name: e.target.value });
                                handleInputChange();
                              }}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase text-primary">Telefone</Label>
                            <Input
                              name="phone"
                              id="phone"
                              className={`h-10 bg-background/50 font-medium rounded-xl transition-all ${
                                hasError("phone") || hasError("telefone") ? "border-red-500 ring-1 ring-red-500/50 animate-shake" : ""
                              }`}
                              value={personalData.phone}
                              onChange={(e) => {
                                setPersonalData({ ...personalData, phone: e.target.value });
                                handleInputChange();
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            onClick={() => updateProfile(personalData)}
                            disabled={isUpdatingProfile}
                            size="sm"
                            className="btn-neon min-w-[130px]"
                          >
                            {isUpdatingProfile
                              ? <Loader2 className="animate-spin h-3.5 w-3.5" />
                              : <><Save className="w-3.5 h-3.5 mr-1.5" /> Salvar</>
                            }
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* E-mail */}
                    <Card className="glass-card border-white/5">
                      <CardHeader className="pb-3 pt-5 px-6">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                          E-mail de Acesso
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-6 pb-5 space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-primary">E-mail</Label>
                          <Input
                            name="email"
                            id="email"
                            type="email"
                            className={`h-10 bg-background/50 font-medium rounded-xl transition-all ${
                              hasError("email") || !!emailError ? "border-red-500 ring-1 ring-red-500/50 animate-shake" : ""
                            }`}
                            value={emailData.email}
                            onChange={(e) => handleEmailChange(e.target.value)}
                          />
                          {/* Erro local de email */}
                          <AnimatePresence>
                            {emailError && (
                              <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1"
                              >
                                <XIcon size={11} /> {emailError}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            onClick={handleSaveEmail}
                            disabled={isUpdatingEmail}
                            size="sm"
                            className="btn-neon min-w-[130px]"
                          >
                            {isUpdatingEmail
                              ? <Loader2 className="animate-spin h-3.5 w-3.5" />
                              : <><Save className="w-3.5 h-3.5 mr-1.5" /> Salvar</>
                            }
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>

              ) : (

                /* ── ABA: SEGURANÇA ── */
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="max-w-md"
                >
                  <Card className="glass-card border-white/5">
                    <CardHeader className="pb-3 pt-5 px-6">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Alterar Senha
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-5 space-y-4">

                      {/* Senha Atual */}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-primary">Senha Atual</Label>
                          <div className="relative">
                            <Input
                              name="oldPassword"
                              id="oldPassword"
                              type={showOld ? "text" : "password"}
                              
                              // ADICIONE ESTA LINHA ABAIXO:
                              autoComplete="new-password" 
                              
                              className={`h-10 bg-background/50 font-medium rounded-xl pr-10 transition-all ${
                                hasError("oldPassword") ? "border-red-500 ring-1 ring-red-500/50 animate-shake" : ""
                              }`}
                              value={passwordData.oldPassword}
                              onChange={(e) => handlePasswordFieldChange("oldPassword", e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowOld((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                            >
                              {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>

                      {/* Nova Senha + Gerador */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-bold uppercase text-primary">Nova Senha</Label>
                          <button
                            type="button"
                            onClick={handleGeneratePassword}
                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary/70 hover:text-primary transition-colors"
                          >
                            <Wand2 size={11} /> Gerar senha forte
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            name="newPassword"
                            id="newPassword"
                            type={showNew ? "text" : "password"}
                            className={`h-10 bg-background/50 font-medium rounded-xl pr-10 transition-all ${
                              hasError("newPassword") ? "border-red-500 ring-1 ring-red-500/50 animate-shake" : ""
                            }`}
                            value={passwordData.newPassword}
                            onChange={(e) => handlePasswordFieldChange("newPassword", e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                          >
                            {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>

                        {/* Medidor de força */}
                        <AnimatePresence>
                          {passwordData.newPassword && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-1.5 overflow-hidden"
                            >
                              {/* Barras */}
                              <div className="flex gap-1 mt-2">
                                {[1, 2, 3, 4].map((bar) => (
                                  <div
                                    key={bar}
                                    className="h-1 flex-1 rounded-full transition-all duration-300"
                                    style={{
                                      background: bar <= strength.score ? strength.barColor : "rgba(255,255,255,0.1)",
                                    }}
                                  />
                                ))}
                              </div>
                              {/* Label + Requisitos */}
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${strength.color}`}>
                                  {strength.label}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
                                {[
                                  { ok: passwordData.newPassword.length >= 6,   label: "Mín. 6 caracteres" },
                                  { ok: /[A-Z]/.test(passwordData.newPassword), label: "Letra maiúscula" },
                                  { ok: /[0-9]/.test(passwordData.newPassword), label: "Número" },
                                  { ok: /[^A-Za-z0-9]/.test(passwordData.newPassword), label: "Símbolo (@#$...)" },
                                ].map(({ ok, label }) => (
                                  <span key={label} className={`text-[10px] flex items-center gap-1 ${ok ? "text-green-500" : "text-muted-foreground/60"}`}>
                                    {ok ? <Check size={10} /> : <XIcon size={10} />} {label}
                                  </span>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Confirmar Nova Senha */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-primary">Confirmar Nova Senha</Label>
                        <div className="relative">
                          <Input
                            name="confirmPassword"
                            id="confirmPassword"
                            type={showConfirm ? "text" : "password"}
                            className={`h-10 bg-background/50 font-medium rounded-xl pr-10 transition-all ${
                              hasError("confirmPassword") || !!confirmError
                                ? "border-red-500 ring-1 ring-red-500/50 animate-shake"
                                : passwordData.confirmPassword && passwordData.confirmPassword === passwordData.newPassword
                                ? "border-green-500 ring-1 ring-green-500/30"
                                : ""
                            }`}
                            value={passwordData.confirmPassword}
                            onChange={(e) => handlePasswordFieldChange("confirmPassword", e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                          >
                            {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>

                        {/* Erro local de confirmação */}
                        <AnimatePresence>
                          {confirmError && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1"
                            >
                              <XIcon size={11} /> {confirmError}
                            </motion.p>
                          )}
                          {/* Confirmação correta */}
                          {!confirmError &&
                            passwordData.confirmPassword &&
                            passwordData.confirmPassword === passwordData.newPassword && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="text-[11px] text-green-500 font-medium flex items-center gap-1 mt-1"
                            >
                              <Check size={11} /> Senhas conferem
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          onClick={handleSavePassword}
                          disabled={!canSavePassword}
                          size="sm"
                          className="btn-neon min-w-[130px]"
                        >
                          {isUpdatingPassword
                            ? <Loader2 className="animate-spin h-3.5 w-3.5" />
                            : <><Save className="w-3.5 h-3.5 mr-1.5" /> Alterar Senha</>
                          }
                        </Button>
                      </div>

                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ProfileSettings;