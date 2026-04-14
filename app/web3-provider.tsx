'use client';

import React, { useMemo, useCallback } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import CSS standard untuk UI wallet
import '@solana/wallet-adapter-react-ui/styles.css';

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
    // Menggunakan Devnet untuk pengembangan Zegen Tech
    const network = WalletAdapterNetwork.Devnet; 
    
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);
    
    // Menentukan wallet yang didukung (Phantom)
    const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

    // UPDATE: Menangkap error global dengan console.warn agar tidak muncul layar merah
    const onError = useCallback((error: any) => {
        // Gunakan console.group agar log tetap rapi di console browser
        console.group("Solana Wallet Notification");
        
        // GANTI console.error menjadi console.warn
        // Ini adalah kunci agar Next.js tidak memunculkan layar merah (Overlay)
        console.warn("Pesan:", error.message || "Wallet disconnected");
        
        console.groupEnd();
        
        // Error sekarang "dijinakkan" di sini sehingga tidak melempar ke Root Next.js
    }, []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            {/* Properti onError sekarang menggunakan console.warn untuk stabilitas UI */}
            <WalletProvider wallets={wallets} autoConnect onError={onError}>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};