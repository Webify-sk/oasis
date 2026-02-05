'use client';

import React, { createContext, useContext } from 'react';

type VerificationContextType = {
    isVerified: boolean;
};

const VerificationContext = createContext<VerificationContextType>({
    isVerified: true, // Default to true to avoid flashing unrelated errors often, or false?
    // Safer to default to true for "optimistic" and let server override, 
    // OR default undefined and wait. But here we will pass initial value from Server layout.
});

export function VerificationProvider({
    children,
    isVerified
}: {
    children: React.ReactNode;
    isVerified: boolean;
}) {
    return (
        <VerificationContext.Provider value={{ isVerified }}>
            {children}
        </VerificationContext.Provider>
    );
}

export function useVerification() {
    return useContext(VerificationContext);
}
