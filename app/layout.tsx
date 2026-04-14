import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "./web3-provider"; // Logika onError sudah ada di dalam sini

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zegen Tech Web3",
  description: "Web3 Portfolio and DApp",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Web3Provider membungkus children agar seluruh halaman 
          memiliki akses ke wallet adapter dan menangkap error disconnect secara global.
        */}
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}