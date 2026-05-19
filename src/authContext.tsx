import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, updateDoc, collection, query, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

interface Profile {
  uid: string;
  email: string;
  role: 'user' | 'owner' | 'admin' | 'driver';
  roles?: ('user' | 'owner' | 'admin' | 'driver')[];
  status?: 'pending' | 'accepted' | 'rejected';
  balance: number;
  fullName: string;
  theme?: 'light' | 'dark';
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  selectedRole: 'user' | 'owner' | 'admin' | 'driver' | null;
  setSelectedRole: (role: 'user' | 'owner' | 'admin' | 'driver') => void;
  toggleTheme: () => void;
  upgradeToOwner: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true,
  selectedRole: null,
  setSelectedRole: () => {},
  toggleTheme: () => {},
  upgradeToOwner: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'user' | 'owner' | 'admin' | 'driver' | null>(null);
  const [ledgerBalance, setLedgerBalance] = useState(0);

  // Secure balance calculation via ledger
  useEffect(() => {
    if (!user) {
      setLedgerBalance(0);
      return;
    }
    const q = query(collection(db, 'ledger'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      let total = 0;
      snap.forEach((doc) => {
        const data = doc.data();
        total += data.amount || 0;
      });
      setLedgerBalance(total);
    }, (err) => console.error("Ledger sync error:", err));
    return () => unsubscribe();
  }, [user]);

  const effectiveProfile = profile ? {
    ...profile,
    balance: (profile.balance || 0) + ledgerBalance
  } : null;

  const upgradeToOwner = async () => {
    if (!profile || profile.roles?.includes('owner')) return;
    try {
      const updatedRoles = Array.from(new Set([...(profile.roles || []), 'owner'] as const));
      await updateDoc(doc(db, 'profiles', profile.uid), { 
        roles: updatedRoles,
        role: profile.roles?.includes('admin') ? 'admin' : 'owner', // Keep primary role as admin if already is
        status: 'pending' 
      });
    } catch (err) {
      console.error("Upgrade error:", err);
    }
  };

  const toggleTheme = async () => {
    if (!profile) return;
    const newTheme = profile.theme === 'light' ? 'dark' : 'light';
    try {
      await updateDoc(doc(db, 'profiles', profile.uid), { theme: newTheme });
    } catch (err) {
      console.error("Error toggling theme:", err);
    }
  };

  useEffect(() => {
    // Apply theme to document
    if (profile?.theme) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(profile.theme);
    } else {
      document.documentElement.classList.add('dark'); // Default
    }
  }, [profile?.theme]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(u);
      if (u) {
        const userPath = `profiles/${u.uid}`;
        const userDocRef = doc(db, 'profiles', u.uid);
        
        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as Profile;
            // Force admin role for Marcellin Murhula
            if (data.email === 'marcmurhularut@gmail.com' && (!data.roles?.includes('admin') || data.role !== 'admin')) {
              const updatedRoles = Array.from(new Set([...(data.roles || []), 'admin', 'user', 'owner', 'driver'] as const));
              updateDoc(userDocRef, { role: 'admin', roles: updatedRoles }).catch(() => {});
              setProfile({ ...data, role: 'admin', roles: updatedRoles });
              if (!selectedRole) setSelectedRole('admin');
            } else {
              // Ensure at least basic user role
              const currentRoles = data.roles || [data.role];
              setProfile({ ...data, roles: currentRoles as any });
              if (!selectedRole) setSelectedRole(data.role);
            }
          } else {
            const isMarcellin = u.email === 'marcmurhularut@gmail.com';
            const initialRoles: ('user' | 'owner' | 'admin' | 'driver')[] = isMarcellin ? ['admin', 'user', 'owner', 'driver'] : ['user'];
            const newProfile: Profile = {
              uid: u.uid,
              email: u.email || '',
              role: isMarcellin ? 'admin' : 'user',
              roles: initialRoles,
              status: isMarcellin ? 'accepted' : 'accepted',
              balance: 0,
              fullName: u.displayName || 'Utilisateur',
              theme: 'dark'
            };
            setDoc(userDocRef, newProfile).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, userPath);
            });
            setProfile(newProfile);
            if (!selectedRole) setSelectedRole(newProfile.role);
          }
          setLoading(false);
        }, (err) => {
           handleFirestoreError(err, OperationType.GET, userPath);
           setLoading(false);
        });
      } else {
        setProfile(null);
        setSelectedRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [selectedRole]);

  return (
    <AuthContext.Provider value={{ user, profile: effectiveProfile, loading, selectedRole, setSelectedRole, toggleTheme, upgradeToOwner }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
