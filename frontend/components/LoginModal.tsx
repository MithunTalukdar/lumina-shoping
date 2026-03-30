import React, { useEffect, useState } from "react";
import GoogleIcon from "./GoogleIcon";
import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  verifyPasswordResetOtp,
} from "../services/authService";

interface LoginModalProps {
  isOpen: boolean;
  initialMode?: "login" | "register";
  isSubmitting: boolean;
  errorMessage: string | null;
  contextMessage?: string | null;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onGoogle: (mode: "login" | "register") => void;
}

type RecoveryStep = "auth" | "forgot" | "otp" | "reset";

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  initialMode = "login",
  isSubmitting,
  errorMessage,
  contextMessage,
  onClose,
  onLogin,
  onRegister,
  onGoogle,
}) => {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [step, setStep] = useState<RecoveryStep>("auth");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isRecoverySubmitting, setIsRecoverySubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setMode(initialMode);
    setStep("auth");
    setName("");
    setEmail("");
    setPassword("");
    setRecoveryEmail("");
    setOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setRecoveryError(null);
    setRecoverySuccess(null);
    setCooldownSeconds(0);
    setIsRecoverySubmitting(false);
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (step !== "otp" || cooldownSeconds <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCooldownSeconds((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [step, cooldownSeconds]);

  if (!isOpen) {
    return null;
  }

  const isBusy = isSubmitting || isRecoverySubmitting;

  const resetRecoveryFlow = (nextStep: RecoveryStep = "auth") => {
    setStep(nextStep);
    setRecoveryError(null);
    setRecoverySuccess(null);
    setOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setCooldownSeconds(0);
  };

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (mode === "login") {
      await onLogin(email.trim(), password);
      return;
    }

    await onRegister(name.trim(), email.trim(), password);
  };

  const handleForgotPasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);
    setIsRecoverySubmitting(true);

    try {
      const normalizedEmail = recoveryEmail.trim();
      const response = await requestPasswordResetOtp(normalizedEmail);
      setRecoveryEmail(normalizedEmail);
      setRecoverySuccess(response.message);
      setCooldownSeconds(response.cooldownSeconds ?? 60);
      setStep("otp");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send reset OTP.";
      setRecoveryError(message);
    } finally {
      setIsRecoverySubmitting(false);
    }
  };

  const handleVerifyOtpSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);
    setIsRecoverySubmitting(true);

    try {
      const response = await verifyPasswordResetOtp(recoveryEmail.trim(), otp.trim());
      setResetToken(response.resetToken);
      setRecoverySuccess(response.message);
      setStep("reset");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to verify OTP.";
      setRecoveryError(message);
    } finally {
      setIsRecoverySubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);
    setIsRecoverySubmitting(true);

    try {
      const response = await resetPasswordWithOtp(resetToken, newPassword, confirmPassword);
      setMode("login");
      setStep("auth");
      setEmail(recoveryEmail);
      setPassword("");
      setOtp("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setCooldownSeconds(0);
      setRecoverySuccess(response.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reset password.";
      setRecoveryError(message);
    } finally {
      setIsRecoverySubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldownSeconds > 0 || isBusy) {
      return;
    }

    setRecoveryError(null);
    setRecoverySuccess(null);
    setIsRecoverySubmitting(true);

    try {
      const response = await requestPasswordResetOtp(recoveryEmail.trim());
      setRecoverySuccess(response.message);
      setCooldownSeconds(response.cooldownSeconds ?? 60);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to resend OTP.";
      setRecoveryError(message);
    } finally {
      setIsRecoverySubmitting(false);
    }
  };

  const renderStatus = () => {
    const activeError = step === "auth" ? (recoverySuccess ? null : errorMessage) : recoveryError;
    const activeSuccess = recoverySuccess;

    return (
      <>
        {activeError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{activeError}</p>
        )}

        {activeSuccess && (
          <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {activeSuccess}
          </p>
        )}

        {step === "auth" && contextMessage && (
          <p className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-800">
            {contextMessage}
          </p>
        )}
      </>
    );
  };

  const renderAuthForm = () => (
    <>
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-gray-100 p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            resetRecoveryFlow("auth");
          }}
          className={`rounded-lg py-2 transition-colors ${mode === "login" ? "bg-white text-gray-900 shadow" : "text-gray-500"}`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            resetRecoveryFlow("auth");
          }}
          className={`rounded-lg py-2 transition-colors ${mode === "register" ? "bg-white text-gray-900 shadow" : "text-gray-500"}`}
        >
          Register
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleAuthSubmit}>
        {mode === "register" && (
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="Your name"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <label className="block text-sm font-semibold text-gray-700">Password</label>
            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setRecoveryEmail(email.trim());
                  setRecoveryError(null);
                  setRecoverySuccess(null);
                  setStep("forgot");
                }}
                className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 transition-colors hover:text-indigo-700"
              >
                Forgot Password?
              </button>
            )}
          </div>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            placeholder="Minimum 8 characters"
          />
        </div>

        {renderStatus()}

        <button
          type="submit"
          disabled={isBusy}
          className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isBusy ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
        </button>

        <div className="flex items-center gap-3 pt-1">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">or</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={() => onGoogle(mode)}
          disabled={isBusy}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <GoogleIcon className="h-5 w-5" />
          <span>{mode === "login" ? "Continue with Google" : "Sign up with Google"}</span>
        </button>
      </form>
    </>
  );

  const renderForgotPasswordForm = () => (
    <form className="space-y-4" onSubmit={handleForgotPasswordSubmit}>
      <p className="text-sm leading-6 text-gray-600">
        Enter your registered email address and we&apos;ll send a secure one-time password to verify the reset request.
      </p>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Registered Email</label>
        <input
          type="email"
          required
          value={recoveryEmail}
          onChange={(event) => setRecoveryEmail(event.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="you@example.com"
        />
      </div>

      {renderStatus()}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => resetRecoveryFlow("auth")}
          className="rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          Back to Login
        </button>
        <button
          type="submit"
          disabled={isBusy}
          className="rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isBusy ? "Sending OTP..." : "Send OTP"}
        </button>
      </div>
    </form>
  );

  const renderOtpForm = () => (
    <form className="space-y-4" onSubmit={handleVerifyOtpSubmit}>
      <p className="text-sm leading-6 text-gray-600">
        Enter the OTP sent to <span className="font-semibold text-gray-900">{recoveryEmail}</span>. The code expires in a few minutes.
      </p>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">OTP Code</label>
        <input
          type="text"
          required
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-center text-lg font-bold tracking-[0.4em] outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="123456"
        />
      </div>

      {renderStatus()}

      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span>{cooldownSeconds > 0 ? `Resend available in ${cooldownSeconds}s` : "Didn’t receive the OTP?"}</span>
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={cooldownSeconds > 0 || isBusy}
          className="font-bold text-indigo-600 transition-colors hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          Resend OTP
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setOtp("");
            setRecoveryError(null);
            setRecoverySuccess(null);
            setStep("forgot");
          }}
          className="rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          Change Email
        </button>
        <button
          type="submit"
          disabled={isBusy}
          className="rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isBusy ? "Verifying..." : "Verify OTP"}
        </button>
      </div>
    </form>
  );

  const renderResetForm = () => (
    <form className="space-y-4" onSubmit={handleResetPasswordSubmit}>
      <p className="text-sm leading-6 text-gray-600">
        OTP verified for <span className="font-semibold text-gray-900">{recoveryEmail}</span>. Set a new password to complete recovery.
      </p>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">New Password</label>
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="Minimum 8 characters"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Confirm Password</label>
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="Re-enter your new password"
        />
      </div>

      {renderStatus()}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setRecoveryError(null);
            setRecoverySuccess(null);
            setStep("otp");
          }}
          className="rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          Back to OTP
        </button>
        <button
          type="submit"
          disabled={isBusy}
          className="rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isBusy ? "Updating..." : "Reset Password"}
        </button>
      </div>
    </form>
  );

  const title =
    step === "forgot"
      ? "Forgot Password"
      : step === "otp"
      ? "Verify OTP"
      : step === "reset"
      ? "Reset Password"
      : mode === "login"
      ? "Login"
      : "Create Account";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {step === "auth" && renderAuthForm()}
        {step === "forgot" && renderForgotPasswordForm()}
        {step === "otp" && renderOtpForm()}
        {step === "reset" && renderResetForm()}
      </div>
    </div>
  );
};

export default LoginModal;
