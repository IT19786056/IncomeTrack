import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, logout } from '../firebase';
import type { UserProfile } from '../types';

/**
 * The bootstrap admin address. Kept in an env var so the account isn't baked
 * into the bundle; the fallback preserves the original owner's access.
 * The Firestore rules enforce this independently — this is only for creating
 * the first profile.
 */
const ADMIN_EMAIL = (
  import.meta.env.VITE_ADMIN_EMAIL ?? 'ravindijason@gmail.com'
).toLowerCase();

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  /** Set when sign-in succeeded but access was refused, shown on the login screen. */
  accessError: string | null;
}

const AuthContext = createContext<AuthState | null>(null);

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (signedIn) => {
      if (!signedIn) {
        setProfile(null);
        setUser(null);
        setLoading(false);
        return;
      }

      const email = signedIn.email?.toLowerCase() ?? '';
      const isAdminEmail = email === ADMIN_EMAIL;

      const denyAccess = async (message: string) => {
        setAccessError(message);
        setProfile(null);
        setUser(null);
        setLoading(false);
        await logout();
      };

      try {
        const userRef = doc(db, 'users', signedIn.uid);
        const [userSnap, inviteSnap] = await Promise.all([
          getDoc(userRef),
          getDoc(doc(db, 'invitations', email)),
        ]);

        // Re-checked on every sign-in, not just the first, so access can be revoked.
        if (!isAdminEmail && !inviteSnap.exists()) {
          await denyAccess(
            userSnap.exists()
              ? 'Your access has been revoked. Contact the administrator to be re-invited.'
              : 'No invitation found for this email. Ask the administrator for access.',
          );
          return;
        }

        if (userSnap.exists()) {
          setProfile(userSnap.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: signedIn.uid,
            displayName: signedIn.displayName,
            email: signedIn.email,
            currency: 'LKR',
            role: isAdminEmail ? 'admin' : 'user',
            isInvited: true,
            createdAt: serverTimestamp() as unknown as null,
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        }

        if (inviteSnap.exists() && inviteSnap.data().status !== 'accepted') {
          // Non-fatal: the invitation is already honoured, this only tidies status.
          await setDoc(
            doc(db, 'invitations', email),
            { status: 'accepted' },
            { merge: true },
          ).catch((error) =>
            console.error('Failed to mark invitation accepted', error),
          );
        }

        setAccessError(null);
        setUser(signedIn);
      } catch (error) {
        console.error('Sign-in check failed', error);
        await denyAccess(
          'Could not verify your access. Check your connection and try again.',
        );
        return;
      }

      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, accessError }}>
      {children}
    </AuthContext.Provider>
  );
};
