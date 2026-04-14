'use client';
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState, useCallback } from "react";
import { LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  
  const [balance, setBalance] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [rank, setRank] = useState("Guest");

  // --- STATE REFERRAL & EARN ---
  const [referralCode, setReferralCode] = useState("");
  const [refPoints, setRefPoints] = useState(0);
  const [referredBy, setReferredBy] = useState<string | null>(null);

  // --- STATE CORE UI & LOGIC ---
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const [canCheckIn, setCanCheckIn] = useState(true);
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);
  const [loadingAirdrop, setLoadingAirdrop] = useState(false);

  // --- STATE UNTUK GLOBAL RECENT ACTIVITIES ---
  const [globalActivities, setGlobalActivities] = useState([
    { user: "0x7a...2b", action: "Earned 50 Ref Points", time: "2 mins ago", icon: "💎" },
    { user: "SolanaKing", action: "Reached 12 Days Streak", time: "5 mins ago", icon: "🔥" },
    { user: "ZegenDev", action: "Joined via Referral", time: "15 mins ago", icon: "🤝" },
  ]);

  const addGlobalActivity = (action: string, icon: string) => {
    const userDisplay = publicKey 
      ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` 
      : "Guest";
    
    const newActivity = {
      user: userDisplay,
      action: action,
      time: "Just now",
      icon: icon
    };
    setGlobalActivities(prev => [newActivity, ...prev.slice(0, 5)]);
  };

  useEffect(() => { setMounted(true); }, []);

  // --- LOGIKA REFERRAL & INITIAL LOAD ---
  useEffect(() => {
    if (mounted) {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref && ref !== publicKey?.toBase58()) {
        setReferredBy(ref);
        localStorage.setItem('zegen_referred_by', ref);
      }

      const savedDate = localStorage.getItem('zegen_last_checkin');
      const savedStreak = localStorage.getItem('zegen_streak');
      const savedPoints = localStorage.getItem('zegen_ref_points');
      const today = new Date().toLocaleDateString();

      if (savedDate) setLastCheckIn(savedDate);
      if (savedStreak) setStreak(parseInt(savedStreak || "0"));
      if (savedPoints) setRefPoints(parseInt(savedPoints));
      if (savedDate === today) setCanCheckIn(false);

      if (publicKey) {
        setReferralCode(`${window.location.origin}?ref=${publicKey.toBase58()}`);
      }
    }
  }, [mounted, publicKey]);

  // --- FITUR: REQUEST AIRDROP (DENGAN ERROR HANDLING) ---
  const handleAirdrop = async () => {
    if (!publicKey) return alert("Connect wallet dulu, Gi!");
    
    try {
      setLoadingAirdrop(true);
      
      // Request 1 SOL
      const signature = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      
      // Tunggu konfirmasi
      const latestBlockHash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      addGlobalActivity("Claimed 1.0 SOL Faucet", "🚰");
      alert("Airdrop Berhasil! 1 SOL masuk. 🚀");
      getWalletData(); // Refresh saldo
    } catch (error: any) {
      console.error("Detail Eror:", error);
      // Pesan yang lebih manusiawi untuk user jika faucet limit/down
      alert("Maaf Gi, Faucet Solana Devnet lagi penuh/error. Coba lagi dalam 1 menit atau gunakan faucet eksternal.");
    } finally {
      setLoadingAirdrop(false);
    }
  };

  // --- FITUR: FAME SHARING (TWITTER/X) ---
  const shareToTwitter = () => {
    if (!publicKey) return alert("Connect wallet dulu untuk pamer pencapaian! 🚀");
    const tweetText = `I'm grinding on Zegen Tech! 🚀\n\nCurrent Rank: ${rank}\nStreak: ${streak} Days 🔥\nPoints: ${refPoints} 💎\n\nJoin me on Solana Devnet and earn points here:\n${referralCode}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank');
  };

  const copyReferral = () => {
    if (!publicKey) return alert("Hubungkan wallet dulu, Gi!");
    navigator.clipboard.writeText(referralCode);
    alert("Referral link disalin! Bagikan untuk dapat poin 💎");
  };

  const updateRank = (bal: number) => {
    if (bal === 0) setRank("Beginner");
    else if (bal > 0 && bal <= 1) setRank("Solana Scout");
    else if (bal > 1 && bal <= 5) setRank("Web3 Warrior");
    else if (bal > 5) setRank("Solana Whale 🐳");
  };

  const getWalletData = useCallback(async () => {
    if (connected && publicKey) {
      try {
        const bal = await connection.getBalance(publicKey);
        const solBalance = bal / LAMPORTS_PER_SOL;
        setBalance(solBalance);
        updateRank(solBalance);
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 5 });
        setHistory(signatures);
      } catch (e: any) { console.error("Gagal ambil data:", e); }
    }
  }, [publicKey, connected, connection]);

  useEffect(() => {
    if (connected && publicKey) {
      getWalletData();
    } else { 
      setBalance(null); 
      setHistory([]); 
      setRank("Guest"); 
    }
  }, [connected, publicKey, getWalletData]);

  const handleDailyCheckIn = () => {
    const today = new Date().toLocaleDateString();
    if (lastCheckIn === today) return;

    const newStreak = streak + 1;
    setStreak(newStreak);
    setLastCheckIn(today);
    setCanCheckIn(false);

    localStorage.setItem('zegen_last_checkin', today);
    localStorage.setItem('zegen_streak', newStreak.toString());

    addGlobalActivity(`Checked in (Day ${newStreak} Streak)`, "🔥");
    alert(`Check-in Berhasil! Streak kamu: ${newStreak} hari 🔥`);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;
    try {
      setTxLoading(true);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(receiver),
          lamports: parseFloat(amount.replace(',', '.')) * LAMPORTS_PER_SOL,
        })
      );
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      
      if (referredBy) {
        const newPoints = refPoints + 10;
        setRefPoints(newPoints);
        localStorage.setItem('zegen_ref_points', newPoints.toString());
        addGlobalActivity("Earned 10 Points (Referral Bonus)", "💎");
      }

      addGlobalActivity(`Sent ${amount} SOL`, "💸");
      setReceiver(""); setAmount("");
      getWalletData();
      alert("Transaksi Berhasil!");
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally { setTxLoading(false); }
  };

  if (!mounted) return null;

  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-[#050505] text-white font-sans selection:bg-indigo-500/30 relative overflow-x-hidden">
      
      {/* NAVBAR */}
      <nav className="w-full max-w-6xl flex justify-between items-center py-6 mb-8 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-black text-sm shadow-lg">ZEGEN</div>
          <button onClick={copyReferral} className="text-[10px] bg-indigo-600/20 border border-indigo-500/30 px-4 py-2 rounded-full font-bold text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all active:scale-95">
            🎁 EARN POINTS
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={shareToTwitter} className="hidden md:block text-[10px] font-black text-zinc-400 hover:text-white transition-all">
            SHARE ACHIEVEMENT 𝕏
          </button>
          <WalletMultiButton className="!rounded-2xl !bg-white !text-black shadow-xl font-bold" />
        </div>
      </nav>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* KOLOM KIRI */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* BALANCE SECTION DENGAN TOMBOL AIRDROP */}
          <section className="p-8 bg-zinc-900/40 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all"></div>
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block">Current Balance</span>
              <button 
                onClick={handleAirdrop}
                disabled={loadingAirdrop || !connected}
                className="text-[9px] font-black bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white hover:text-black transition-all uppercase disabled:opacity-50"
              >
                {loadingAirdrop ? "Dripping..." : "🚰 Request Faucet"}
              </button>
            </div>

            <h2 className="text-5xl font-mono font-bold tracking-tighter relative z-10">
              {connected ? balance?.toFixed(3) : "0.000"} 
              <span className="text-lg text-indigo-400 italic ml-2">SOL</span>
            </h2>
            
            <div className="mt-6 flex justify-between items-center border-t border-white/5 pt-4 relative z-10">
              <div>
                <p className="text-[9px] text-zinc-600 uppercase font-black">Rank Status</p>
                <span className="text-[11px] text-indigo-400 font-bold uppercase">{rank}</span>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-zinc-600 uppercase font-black">Network</p>
                <span className="text-[11px] text-green-500 font-bold uppercase">Devnet</span>
              </div>
            </div>
          </section>

          {/* REFERRAL STATS */}
          <section className="p-8 bg-gradient-to-br from-indigo-900/40 to-black rounded-[2.5rem] border border-indigo-500/20 backdrop-blur-3xl relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2 relative z-10">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Referral Program</h4>
              <button onClick={shareToTwitter} className="bg-white/10 p-2 rounded-full hover:bg-white hover:text-black transition-all">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </button>
            </div>
            <div className="flex items-end gap-2 relative z-10">
              <h2 className="text-5xl font-mono font-bold">{refPoints}</h2>
              <span className="text-sm font-bold text-zinc-500 mb-2">POINTS</span>
            </div>
            <div className="mt-6 p-4 bg-black/40 rounded-2xl border border-white/5 relative z-10">
              <p className="text-[9px] text-zinc-400 uppercase font-black mb-2 tracking-widest">Your Unique Link</p>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-zinc-500 truncate mr-2">
                  {publicKey ? `${referralCode.slice(0, 20)}...` : "Connect Wallet"}
                </span>
                <button onClick={copyReferral} className="text-[9px] font-black text-indigo-400 uppercase">Copy</button>
              </div>
            </div>
          </section>

          {/* DAILY REWARDS & FAME SHARE */}
          <section className="p-6 bg-indigo-600/10 rounded-[2rem] border border-indigo-500/20 group cursor-pointer hover:bg-indigo-600/20 transition-all" onClick={shareToTwitter}>
             <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-indigo-400">Bragging Rights</h4>
                  <p className="text-sm font-bold">Share your {streak} day streak! 🚀</p>
                </div>
                <span className="text-xs group-hover:translate-x-1 transition-transform">↗</span>
             </div>
          </section>
        </div>

        {/* KOLOM KANAN */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TERMINAL */}
            <section className="p-8 bg-zinc-900 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span> Execution Terminal
              </h3>
              <form onSubmit={handleTransfer} className="space-y-5">
                <input type="text" placeholder="Receiver Address" className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-xs font-mono focus:border-indigo-500 outline-none transition-all" value={receiver} onChange={(e) => setReceiver(e.target.value)} required />
                <input type="text" placeholder="0.00 SOL" className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-xs font-mono focus:border-indigo-500 outline-none transition-all" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                <button disabled={txLoading} className="w-full py-4 bg-white text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all active:scale-95">
                  {txLoading ? "Verifying..." : "Execute & Earn"}
                </button>
              </form>
            </section>

            {/* LEDGER ACTIVITY */}
            <section className="p-8 bg-zinc-900/20 rounded-[2.5rem] border border-white/5 overflow-hidden">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 text-zinc-500 italic">Ledger Activity (Live)</h3>
              <div className="space-y-4">
                {history.length > 0 ? (
                  history.map((tx, i) => (
                    <div key={i} className="p-4 bg-black/40 rounded-2xl border border-white/5 group flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-mono text-indigo-400 font-bold block">{tx.signature.slice(0, 10)}...</span>
                        <span className="text-[7px] text-zinc-600 uppercase font-bold">Confirmed</span>
                      </div>
                      <a href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white hover:text-black transition-all">View ↗</a>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-zinc-700 italic text-center py-4">No activity detected.</p>
                )}
              </div>
            </section>
          </div>

          {/* NETWORK FEED */}
          <section className="p-8 bg-zinc-900/40 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl overflow-hidden">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 italic mb-6">Network Live Feed</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {globalActivities.map((act, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-black/40 rounded-2xl border border-white/5">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-lg">{act.icon}</div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-white">{act.user}</p>
                    <p className="text-[9px] text-zinc-500 font-medium">{act.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <footer className="mt-20 py-10 w-full text-center border-t border-white/5">
        <p className="text-[9px] text-zinc-700 uppercase font-black tracking-[0.8em]">ZEGEN TECH &bull; ALL SYSTEMS OPERATIONAL &bull; 2026</p>
      </footer>
    </main>
  );
}