"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import {
  onIdTokenChanged,
  getIdTokenResult,
  signOut,
  type User,
} from "firebase/auth";
import { getDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase/client";
import {
  studentRef,
  userRef,
  configAppRef,
} from "@/lib/firebase/paths";
import { signInWithGooglePopup } from "@/lib/firebase/auth-google";
import { isAdminToken } from "@/lib/auth/claims";
import { checkEmailEligibility } from "@/lib/auth/eligibility";
import type { AuthStatus } from "@/lib/auth/resolveRoute";
import type { UserProfile, StudentProfile, AppConfig } from "@/types/firestore";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  loading: boolean;
  profile: UserProfile | null;
  studentProfile: StudentProfile | null;
  config: AppConfig | null;
  isAdmin: boolean;
  isRegistered: boolean;
  signInWithGoogle: () => Promise<unknown>;
  signOut: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Cache config — it changes rarely
  const configCacheRef = useRef<AppConfig | null>(null);

  const loadConfig = useCallback(async (): Promise<AppConfig | null> => {
    if (configCacheRef.current) return configCacheRef.current;
    try {
      const snap = await getDoc(configAppRef());
      if (snap.exists()) {
        configCacheRef.current = snap.data();
        return configCacheRef.current;
      }
    } catch {
      // config may not exist yet during dev
    }
    return null;
  }, []);

  const resolveStatus = useCallback(
    async (firebaseUser: User | null): Promise<void> => {
      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setStudentProfile(null);
        setIsAdmin(false);
        setStatus("signed-out");
        return;
      }

      setUser(firebaseUser);

      // Get token result to read custom claims and email_verified
      let tokenResult;
      try {
        tokenResult = await getIdTokenResult(firebaseUser);
      } catch {
        setStatus("signed-out");
        return;
      }

      const adminFlag = isAdminToken(tokenResult);
      setIsAdmin(adminFlag);

      if (adminFlag) {
        setStatus("admin");
        return;
      }

      // Load config to check email eligibility
      const cfg = await loadConfig();
      setConfig(cfg);

      const email = firebaseUser.email ?? "";
      if (cfg) {
        const eligibility = checkEmailEligibility(email, cfg);
        if (!eligibility.ok) {
          setStatus("not-eligible");
          return;
        }
      }

      // Load student profile (check students/{uid} first, fallback to users/{uid})
      try {
        const studentSnap = await getDoc(studentRef(firebaseUser.uid));
        if (studentSnap.exists()) {
          const sData = studentSnap.data();
          setStudentProfile(sData);
          setProfile({
            uid: sData.uid,
            fullName: sData.name,
            name: sData.name,
            email: sData.email,
            emailDomain: sData.email.split("@")[1]?.toLowerCase() || "msec.edu.in",
            studentId: sData.registerNumber,
            registerNumber: sData.registerNumber,
            year: sData.year,
            section: sData.section,
            departmentCode: sData.departmentCode,
            department: sData.department,
            departmentId: `dept-${sData.departmentCode}`,
            role: sData.role,
            registrationStatus: sData.registrationStatus,
            emailVerified: true,
            verifiedAt: sData.registeredAt,
            createdAt: sData.registeredAt,
            registeredAt: sData.registeredAt,
            updatedAt: sData.updatedAt,
          });
          setStatus("ready");
          return;
        }

        const userSnap = await getDoc(userRef(firebaseUser.uid));
        if (userSnap.exists()) {
          const uData = userSnap.data();
          setProfile(uData);
          setStudentProfile({
            uid: uData.uid,
            name: uData.fullName || uData.name || "",
            email: uData.email,
            registerNumber: uData.registerNumber || uData.studentId || "",
            year: uData.year || 1,
            departmentCode: uData.departmentCode || "",
            department: uData.department || "",
            section: uData.section || "A",
            role: uData.role || "student",
            registrationStatus: uData.registrationStatus || "registered",
            registeredAt: uData.createdAt,
            updatedAt: uData.createdAt,
          });
          setStatus("ready");
          return;
        }

        setStudentProfile(null);
        setProfile(null);
        setStatus("needs-profile");
      } catch (err) {
        console.error("Error resolving student profile:", err);
        setStudentProfile(null);
        setProfile(null);
        setStatus("needs-profile");
      }
    },
    [loadConfig]
  );

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, resolveStatus);
    return unsubscribe;
  }, [resolveStatus]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setStudentProfile(null);
    setIsAdmin(false);
    setStatus("signed-out");
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return signInWithGooglePopup();
  }, []);

  const refreshAuth = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      await resolveStatus(auth.currentUser);
    }
  }, [resolveStatus]);

  const loading = status === "loading";
  const isRegistered = status === "ready" || !!studentProfile;

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        loading,
        profile,
        studentProfile,
        config,
        isAdmin,
        isRegistered,
        signInWithGoogle,
        signOut: signOutUser,
        signOutUser,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
