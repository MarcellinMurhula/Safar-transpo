import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

interface Profile {
  uid: string;
  email: string;
  role: 'user' | 'owner' | 'admin';
  status?: 'pending' | 'accepted' | 'rejected';
  balance: number;
  fullName: string;
  theme?: 'light' | 'dark';
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  selectedRole: 'user' | 'owner' | 'admin' | null;
  setSelectedRole: (role: 'user' | 'owner' | 'admin') => void;
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true,
  selectedRole: null,
  setSelectedRole: () => {},
  toggleTheme: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'user' | 'owner' | 'admin' | null>(null);

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
            if (data.email === 'marcmurhularut@gmail.com' && data.role !== 'admin') {
              updateDoc(userDocRef, { role: 'admin' }).catch(() => {});
              setProfile({ ...data, role: 'admin' });
              if (!selectedRole) setSelectedRole('admin');
            } else {
              setProfile(data);
              if (!selectedRole) setSelectedRole(data.role);
            }
          } else {
            const isMarcellin = u.email === 'marcmurhularut@gmail.com';
            const newProfile: Profile = {
              uid: u.uid,
              email: u.email || '',
              role: isMarcellin ? 'admin' : 'user',
              status: isMarcellin ? 'accepted' : 'accepted', // Users/Admins auto-accept, Owners pending
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
    <AuthContext.Provider value={{ user, profile, loading, selectedRole, setSelectedRole, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
