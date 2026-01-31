"use client";

import { PrivyProvider } from '@privy-io/react-auth';
import { mainnet, arbitrum, optimism, polygon, sepolia } from 'viem/chains';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { Component, type ReactNode } from 'react';

// 检查是否是安全环境（HTTPS 或 localhost）
function isSecureContext(): boolean {
  if (typeof window === 'undefined') return true; // SSR 假设安全
  return window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
}

// Error Boundary 捕获 Privy 初始化错误
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class PrivyErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      // 如果 Privy 出错，静默继续渲染子组件
      console.warn('[PrivyWrapper] Privy initialization failed, continuing without Privy:', this.state.error?.message);
      return this.props.children;
    }
    return this.props.children;
  }
}

function PrivyProviderInner({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmkgl3ppv04scjy0cbvjco4h1";
  const isSecure = isSecureContext();
  
  // 配置 Solana 錢包連接器
  const solanaConnectors = toSolanaWalletConnectors({
    shouldAutoConnect: false,
  });

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['wallet', 'email', 'google', 'twitter', 'discord'],
        appearance: {
          theme: 'dark',
          accentColor: '#8a2be2',
          showWalletLoginFirst: true,
          logo: '/octopus-logo.png',
        },
        // 非 HTTPS 环境禁用嵌入式钱包
        embeddedWallets: isSecure ? {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        } : {
          ethereum: {
            createOnLogin: 'off',
          },
        },
        // EVM 鏈配置
        defaultChain: arbitrum,
        supportedChains: [mainnet, arbitrum, optimism, polygon, sepolia],
        // Solana 錢包配置
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
        // 錢包連接配置
        walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      }}
    >
      {children}
    </PrivyProvider>
  );
}

export function PrivyWrapper({ children }: { children: ReactNode }) {
  return (
    <PrivyErrorBoundary>
      <PrivyProviderInner>{children}</PrivyProviderInner>
    </PrivyErrorBoundary>
  );
}