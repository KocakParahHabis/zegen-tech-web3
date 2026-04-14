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
      } catch (e: any) { 
        console.error("Gagal ambil data blockchain:", e);
        setBalance(0); 
      }
    }
  }, [publicKey, connected, connection]);

  useEffect(() => {
    const loadData = async () => {
      if (mounted && connected && publicKey) {
        const walletAddr = publicKey.toBase58();
        const savedDate = localStorage.getItem(`zegen_date_${walletAddr}`);
        const savedStreak = localStorage.getItem(`zegen_streak_${walletAddr}`);
        const savedPoints = localStorage.getItem(`zegen_points_${walletAddr}`);
        const today = new Date().toLocaleDateString();

        setLastCheckIn(savedDate || null);
        setStreak(parseInt(savedStreak || "0"));
        setRefPoints(parseInt(savedPoints || "0"));
        setCanCheckIn(savedDate !== today);
        setReferralCode(`${window.location.origin}?ref=${walletAddr}`);
        
        try {
          const bal = await connection.getBalance(publicKey);
          const solBalance = bal / LAMPORTS_PER_SOL;
          setBalance(solBalance);
          updateRank(solBalance);
          const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 5 });
          setHistory(signatures);
        } catch (err) {
          console.error("Gagal sinkron saldo:", err);
        }
      } else if (mounted && !connected) {
        setBalance(null);
        setHistory([]);
        setRank("Guest");
        setRefPoints(0);
        setStreak(0);
        setCanCheckIn(true);
      }
    };
    loadData();
  }, [mounted, connected, publicKey, connection, getWalletData]);

  const handleDailyCheckIn = () => {
    if (!connected || !publicKey) return alert("Connect wallet dulu, Gi!");
    const today = new Date().toLocaleDateString();
    if (lastCheckIn === today) return;
    const walletAddr = publicKey.toBase58();
    const newStreak = streak + 1;
    const newPoints = refPoints + 5; 
    setStreak(newStreak);
    setRefPoints(newPoints);
    setLastCheckIn(today);
    setCanCheckIn(false);
    localStorage.setItem(`zegen_date_${walletAddr}`, today);
    localStorage.setItem(`zegen_streak_${walletAddr}`, newStreak.toString());
    localStorage.setItem(`zegen_points_${walletAddr}`, newPoints.toString());
    addGlobalActivity(`Checked in (Day ${newStreak} Streak)`, "🔥");
    alert(`Check-in Berhasil! +5 Points. Streak kamu: ${newStreak} hari 🔥`);
  };

  const handleAirdrop = async () => {
    if (!publicKey) return alert("Connect wallet dulu, Gi!");
    try {
      setLoadingAirdrop(true);
      const signature = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      const latestBlockHash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });
      addGlobalActivity("Claimed 1.0 SOL Faucet", "🚰");
      alert("Airdrop Berhasil!");
      getWalletData(); 
    } catch (error: any) {
      alert("Maaf Gi, Faucet Solana Devnet lagi sibuk!");
    } finally {
      setLoadingAirdrop(false);
    }
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
      const walletAddr = publicKey.toBase58();
      const newPoints = refPoints + 10;
      setRefPoints(newPoints);
      localStorage.setItem(`zegen_points_${walletAddr}`, newPoints.toString());
      addGlobalActivity(`Sent ${amount} SOL`, "💸");
      setReceiver(""); setAmount("");
      getWalletData();
      alert("Transaksi Berhasil!");
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally { setTxLoading(false); }
  };

  const shareToTwitter = () => {
    if (!publicKey) return alert("Connect wallet dulu!");
    const tweetText = `I'm grinding on Zegen Tech! 🚀\nRank: ${rank}\nStreak: ${streak} Days 🔥\nPoints: ${refPoints} 💎\nJoin me: ${referralCode}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');
  };

  const copyReferral = () => {
    if (!publicKey) return alert("Hubungkan wallet dulu!");
    navigator.clipboard.writeText(referralCode);
    alert("Link disalin!");
  };

  if (!mounted) return null;

  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-[#020202] text-white font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      
      {/* BACKGROUND ESTETIK (LIVING MESH) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full animate-mesh"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full animate-mesh" style={{ animationDelay: '-5s' }}></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[50%] bg-blue-600/5 rounded-full animate-mesh" style={{ animationDelay: '-10s' }}></div>
        
        {/* Efek Garis Grid Halus & Noise */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
      </div>

      {/* NAVBAR - z-index dinaikkan agar di atas mesh */}
      <nav className="w-full max-w-6xl flex justify-between items-center py-6 mb-8 border-b border-white/5 relative z-10">
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

      {/* CONTENT GRID - z-index dinaikkan */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* KOLOM KIRI */}
        <div className="lg:col-span-4 space-y-6">
          <section className="p-8 bg-zinc-900/40 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block">Current Balance</span>
              <button onClick={handleAirdrop} disabled={loadingAirdrop || !connected} className="text-[9px] font-black bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white hover:text-black transition-all uppercase disabled:opacity-50">
                {loadingAirdrop ? "Dripping..." : "🚰 Request Faucet"}
              </button>
            </div>
            <h2 className="text-5xl font-mono font-bold tracking-tighter relative z-10">
              {connected && balance !== null ? balance.toFixed(3) : "0.000"} 
              <span className="text-lg text-indigo-400 italic ml-2">SOL</span>
            </h2>
          </section>

          <section className="p-8 bg-gradient-to-br from-indigo-900/40 to-black rounded-[2.5rem] border border-indigo-500/20 backdrop-blur-3xl relative overflow-hidden">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2">Referral Points</h4>
            <div className="flex items-end gap-2">
              <h2 className="text-5xl font-mono font-bold">{refPoints}</h2>
              <span className="text-sm font-bold text-zinc-500 mb-2">POINTS</span>
            </div>
          </section>

          <section className="p-8 bg-zinc-900/60 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Daily Rewards</h4>
                <p className="text-sm font-bold mt-1">Day {streak} Streak 🔥</p>
              </div>
              <div className="bg-orange-500/20 text-orange-500 text-[10px] font-black px-3 py-1 rounded-full">+5 PTS / DAY</div>
            </div>
            <button 
              onClick={handleDailyCheckIn}
              disabled={!canCheckIn || !connected}
              className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 ${
                canCheckIn && connected
                  ? "bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              {canCheckIn ? "Claim Daily Check-in" : "Already Claimed Today"}
            </button>
          </section>
        </div>

        {/* KOLOM KANAN */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="p-8 bg-zinc-900/60 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl shadow-2xl">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2 text-zinc-400">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span> Execution Terminal
              </h3>
              <form onSubmit={handleTransfer} className="space-y-5">
                <input type="text" placeholder="Receiver Address" className="w-full bg-black/50 border border-zinc-800 p-4 rounded-2xl text-xs font-mono focus:border-indigo-500 outline-none transition-all" value={receiver} onChange={(e) => setReceiver(e.target.value)} required />
                <input type="text" placeholder="0.00 SOL" className="w-full bg-black/50 border border-zinc-800 p-4 rounded-2xl text-xs font-mono focus:border-indigo-500 outline-none transition-all" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                <button disabled={txLoading} className="w-full py-4 bg-white text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-xl">
                  {txLoading ? "Verifying..." : "Execute & Earn"}
                </button>
              </form>
            </section>

            <section className="p-8 bg-zinc-900/40 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl overflow-hidden">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 text-zinc-500 italic">Ledger Activity</h3>
              <div className="space-y-4">
                {history.map((tx, i) => (
                  <div key={i} className="p-4 bg-black/40 rounded-2xl border border-white/5 flex justify-between items-center">
                    <span className="text-[9px] font-mono text-indigo-400 font-bold">{tx.signature.slice(0, 10)}...</span>
                    <a href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black bg-white/5 px-3 py-1.5 rounded-lg hover:bg-white hover:text-black transition-all">View ↗</a>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="p-8 bg-zinc-900/40 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl overflow-hidden">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 italic mb-6">Network Live Feed</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {globalActivities.map((act, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all">
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

      <footer className="mt-20 py-10 w-full text-center border-t border-white/5 text-[9px] text-zinc-700 uppercase font-black tracking-[0.8em] relative z-10">
        ZEGEN TECH &bull; ALL SYSTEMS OPERATIONAL &bull; 2026
      </footer>
    </main>
  );
}