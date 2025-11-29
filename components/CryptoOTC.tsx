
import React, { useState, useEffect } from 'react';
import { Bitcoin, Wallet, ArrowRightLeft, Send, TrendingUp, TrendingDown, RefreshCw, Loader2, CheckCircle, Copy, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';

interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
}

export const CryptoOTC: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'buy' | 'send'>('buy');
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [balance, setBalance] = useState(0);
  const [apiSource, setApiSource] = useState<'coingecko' | 'binance'>('coingecko');
  
  // Buy State
  const [selectedAsset, setSelectedAsset] = useState<string>('bitcoin');
  const [buyAmountBrl, setBuyAmountBrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Send State
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmountCrypto, setSendAmountCrypto] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');

  useEffect(() => {
    fetchPrices();
    fetchBalance();
    
    // Auto refresh prices every 30s
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBalance = async () => {
    try {
        const user = authService.getUser();
        if (user?.id) {
            const bal = await authService.getWalletBalance(user.id);
            setBalance(bal);
        }
    } catch (e) { console.error(e); }
  };

  const fetchPrices = async () => {
      // Don't set full loading on refresh to avoid UI flicker, only on initial load
      if (prices.length === 0) setLoadingPrices(true);
      
      try {
          // 1. Try CoinGecko First
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

          const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=brl&include_24hr_change=true', { 
              signal: controller.signal 
          });
          clearTimeout(timeoutId);

          if (!res.ok) throw new Error('CoinGecko Error');
          const data = await res.json();
          
          const mapped: CryptoPrice[] = [
              {
                  id: 'bitcoin', symbol: 'btc', name: 'Bitcoin',
                  current_price: data.bitcoin.brl,
                  price_change_percentage_24h: data.bitcoin.brl_24h_change,
                  image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
              },
              {
                  id: 'ethereum', symbol: 'eth', name: 'Ethereum',
                  current_price: data.ethereum.brl,
                  price_change_percentage_24h: data.ethereum.brl_24h_change,
                  image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'
              },
              {
                  id: 'tether', symbol: 'usdt', name: 'Tether',
                  current_price: data.tether.brl,
                  price_change_percentage_24h: data.tether.brl_24h_change,
                  image: 'https://assets.coingecko.com/coins/images/325/large/Tether.png'
              }
          ];
          setPrices(mapped);
          setApiSource('coingecko');
      } catch (e) {
          console.warn("CoinGecko failed or timed out, switching to Binance API...", e);
          
          try {
              // 2. Fallback to Binance API
              const symbols = JSON.stringify(["BTCBRL", "ETHBRL", "USDTBRL"]);
              const binanceRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`);
              
              if (!binanceRes.ok) throw new Error('Binance Error');
              
              const binanceData = await binanceRes.json();
              
              const mapBinance = (symbol: string, id: string, name: string, img: string) => {
                  const item = binanceData.find((d: any) => d.symbol === symbol);
                  return {
                      id, 
                      symbol: symbol.replace('BRL','').toLowerCase(), 
                      name,
                      current_price: parseFloat(item?.lastPrice || '0'),
                      price_change_percentage_24h: parseFloat(item?.priceChangePercent || '0'),
                      image: img
                  };
              };

              setPrices([
                  mapBinance('BTCBRL', 'bitcoin', 'Bitcoin', 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'),
                  mapBinance('ETHBRL', 'ethereum', 'Ethereum', 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'),
                  mapBinance('USDTBRL', 'tether', 'Tether', 'https://assets.coingecko.com/coins/images/325/large/Tether.png')
              ]);
              setApiSource('binance');
          } catch (binanceError) {
              console.error("All crypto APIs failed", binanceError);
          }
      } finally {
          setLoadingPrices(false);
      }
  };

  const getNetworks = (assetId: string) => {
      switch(assetId) {
          case 'tether': return ['TRC20 (Tron)', 'ERC20 (Ethereum)', 'BEP20 (BSC)', 'Polygon'];
          case 'bitcoin': return ['Bitcoin (Legacy)', 'SegWit (Native)', 'Lightning Network'];
          case 'ethereum': return ['ERC20 (Mainnet)', 'Arbitrum One', 'Optimism', 'Base'];
          default: return ['Mainnet'];
      }
  };

  const handleBuy = async () => {
      setIsProcessing(true);
      setSuccessMsg(null);
      
      // Simulate API processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const val = parseFloat(buyAmountBrl.replace(/\D/g, '')) / 100;
      if (val <= 0) {
          alert("Valor inválido");
          setIsProcessing(false);
          return;
      }
      if (val > balance) {
          alert('Saldo insuficiente na carteira.');
          setIsProcessing(false);
          return;
      }

      setSuccessMsg(`Compra de ${getSelectedCryptoAmount()} ${getSelectedSymbol()} realizada com sucesso!`);
      setBuyAmountBrl('');
      setIsProcessing(false);
  };

  const handleSend = async () => {
    setIsProcessing(true);
    setSuccessMsg(null);
    await new Promise(resolve => setTimeout(resolve, 2500));
    setSuccessMsg(`Envio de ${sendAmountCrypto} ${getSelectedSymbol()} iniciado para a rede ${selectedNetwork}. ID: ${Math.random().toString(36).substr(2,9).toUpperCase()}`);
    setSendAmountCrypto('');
    setSendAddress('');
    setIsProcessing(false);
  };

  const getSelectedPrice = () => prices.find(p => p.id === selectedAsset)?.current_price || 0;
  const getSelectedSymbol = () => prices.find(p => p.id === selectedAsset)?.symbol.toUpperCase() || '';
  
  const getSelectedCryptoAmount = () => {
      if (!buyAmountBrl) return '0.00000000';
      const brl = parseFloat(buyAmountBrl.replace(/\D/g, '')) / 100;
      const price = getSelectedPrice();
      if (!price) return '0.00';
      return (brl / price).toFixed(8);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
               <Bitcoin className="w-8 h-8 text-amber-500" />
               Cripto OTC
           </h2>
           <p className="text-slate-500">Compre e envie criptomoedas usando seu saldo em conta.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            <Wallet className="w-4 h-4 text-slate-400" />
            Saldo Disponível: <span className="text-slate-900 font-bold">{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(balance)}</span>
        </div>
      </div>

      {/* Price Tickers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {prices.map((coin) => (
             <div key={coin.id} 
                onClick={() => setSelectedAsset(coin.id)}
                className={`bg-white p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${selectedAsset === coin.id ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md' : 'border-slate-100 hover:border-slate-300'}`}
             >
                {selectedAsset === coin.id && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>}
                
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                        <div>
                            <h3 className="font-bold text-slate-900">{coin.name}</h3>
                            <span className="text-xs text-slate-400 font-mono uppercase">{coin.symbol}</span>
                        </div>
                    </div>
                    <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${coin.price_change_percentage_24h >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {coin.price_change_percentage_24h >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                    </div>
                </div>
                
                <div className="flex items-baseline gap-1">
                   <span className="text-xs text-slate-400">R$</span>
                   <span className="text-2xl font-bold text-slate-900">
                       {loadingPrices ? '...' : coin.current_price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                   </span>
                </div>
             </div>
          ))}
          {loadingPrices && prices.length === 0 && (
              [1,2,3].map(i => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 h-32 animate-pulse"></div>
              ))
          )}
      </div>

      {/* Main Action Card */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
              <button 
                onClick={() => { setActiveTab('buy'); setSuccessMsg(null); }}
                className={`flex-1 py-6 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'buy' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                  <ArrowRightLeft className="w-4 h-4" /> Comprar Cripto
              </button>
              <button 
                onClick={() => { setActiveTab('send'); setSuccessMsg(null); }}
                className={`flex-1 py-6 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'send' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                  <Send className="w-4 h-4" /> Enviar / Sacar
              </button>
          </div>

          <div className="p-8">
              {successMsg && (
                  <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                      <CheckCircle className="w-5 h-5 shrink-0" />
                      <p className="font-medium text-sm">{successMsg}</p>
                  </div>
              )}

              {/* BUY FORM */}
              {activeTab === 'buy' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="space-y-6">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Você paga (BRL)</label>
                              <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
                                  <input 
                                      type="text" 
                                      value={buyAmountBrl}
                                      onChange={e => {
                                          const v = e.target.value.replace(/\D/g, '');
                                          if(!v) { setBuyAmountBrl(''); return; }
                                          setBuyAmountBrl((parseInt(v)/100).toLocaleString('pt-BR', {minimumFractionDigits: 2}));
                                      }}
                                      placeholder="0,00"
                                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                  />
                              </div>
                              <div className="flex justify-between mt-2 px-1">
                                  <span className="text-xs text-slate-400">Saldo: {balance.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                                  <button 
                                    onClick={() => setBuyAmountBrl((balance).toLocaleString('pt-BR', {minimumFractionDigits: 2}))}
                                    className="text-xs font-bold text-indigo-600 hover:underline"
                                  >
                                      Usar Máximo
                                  </button>
                              </div>
                          </div>

                          <div className="flex justify-center">
                              <div className="bg-slate-100 p-2 rounded-full text-slate-400">
                                  <ArrowRightLeft className="w-5 h-5 rotate-90 md:rotate-0" />
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Você recebe (Estimado)</label>
                              <div className="relative">
                                  <input 
                                      type="text" 
                                      readOnly
                                      value={getSelectedCryptoAmount()}
                                      className="w-full pl-4 pr-16 py-4 bg-slate-100 border border-slate-200 rounded-xl text-2xl font-bold text-slate-600 outline-none"
                                  />
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm uppercase">
                                      {getSelectedSymbol()}
                                  </span>
                              </div>
                          </div>

                          <button 
                              onClick={handleBuy}
                              disabled={isProcessing || !buyAmountBrl}
                              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Compra'}
                          </button>
                      </div>

                      {/* Info Side */}
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 h-full flex flex-col justify-center">
                          <h4 className="font-bold text-slate-900 mb-4">Resumo da Cotação</h4>
                          <div className="space-y-4 text-sm">
                              <div className="flex justify-between pb-4 border-b border-slate-200 border-dashed">
                                  <span className="text-slate-500">Preço Unitário</span>
                                  <span className="font-medium text-slate-900">
                                      {getSelectedPrice().toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                                  </span>
                              </div>
                              <div className="flex justify-between pb-4 border-b border-slate-200 border-dashed">
                                  <span className="text-slate-500">Fonte de Dados</span>
                                  <span className="font-medium text-indigo-600 capitalize">{apiSource} Live</span>
                              </div>
                              <div className="flex justify-between pb-4 border-b border-slate-200 border-dashed">
                                  <span className="text-slate-500">Spread</span>
                                  <span className="font-medium text-slate-900">1.2%</span>
                              </div>
                              <div className="bg-amber-50 p-3 rounded-lg flex gap-2 items-start border border-amber-100">
                                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                  <p className="text-xs text-amber-700 leading-relaxed">
                                      As cotações são atualizadas a cada 30 segundos. O valor final pode sofrer pequenas variações no momento da confirmação.
                                  </p>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* SEND FORM */}
              {activeTab === 'send' && (
                   <div className="max-w-xl mx-auto space-y-6">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ativo</label>
                             <div className="flex gap-3 overflow-x-auto pb-2">
                                 {prices.map(p => (
                                     <button 
                                        key={p.id}
                                        onClick={() => { setSelectedAsset(p.id); setSelectedNetwork(''); }}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-bold text-sm whitespace-nowrap transition-colors ${selectedAsset === p.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                     >
                                         <img src={p.image} className="w-5 h-5 rounded-full" />
                                         {p.name}
                                     </button>
                                 ))}
                             </div>
                        </div>

                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rede de Envio</label>
                             <select 
                                value={selectedNetwork}
                                onChange={e => setSelectedNetwork(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                             >
                                 <option value="">Selecione a rede</option>
                                 {getNetworks(selectedAsset).map(n => (
                                     <option key={n} value={n}>{n}</option>
                                 ))}
                             </select>
                        </div>

                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Endereço da Carteira</label>
                             <div className="relative">
                                <input 
                                    type="text" 
                                    value={sendAddress}
                                    onChange={e => setSendAddress(e.target.value)}
                                    placeholder={`Endereço ${getSelectedSymbol()}`}
                                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-mono"
                                />
                             </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quantidade ({getSelectedSymbol()})</label>
                            <input 
                                type="number" 
                                value={sendAmountCrypto}
                                onChange={e => setSendAmountCrypto(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xl font-bold"
                            />
                        </div>

                        <button 
                            onClick={handleSend}
                            disabled={isProcessing || !sendAddress || !sendAmountCrypto || !selectedNetwork}
                            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Criptomoedas'}
                        </button>
                   </div>
              )}
          </div>
      </div>
    </div>
  );
};
