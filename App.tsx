/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, HistoryEntry, UserProfile, UserSession, Ingredient } from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_HISTORY,
  USER_CAMILA,
} from './data/mockData';
import { Header } from './components/Header';
import { BottomNav, TabId } from './components/BottomNav';
import { ScanScreen } from './components/ScanScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { SavedScreen } from './components/SavedScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { CameraViewfinderModal } from './components/CameraViewfinderModal';
import { FichaTecnicaModal } from './components/FichaTecnicaModal';
import { GroceryListModal } from './components/GroceryListModal';
import { ImpactModal } from './components/ImpactModal';
import { LegalModal } from './components/LegalModal';
import { InicioFormModal, PlanType } from './components/InicioFormModal';
import { LocalVaultService } from './services/localVault';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<TabId>('escanear');

  // Core Data State (loaded from Stitch export and local encrypted vault)
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [history, setHistory] = useState<HistoryEntry[]>(INITIAL_HISTORY);
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('lubo_user_profile');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return USER_CAMILA;
  });
  const [currentScannedProduct, setCurrentScannedProduct] = useState<Product>(
    INITIAL_PRODUCTS[0] // Barra de Granola Avena & Miel Silvestre
  );

  // Formulario de Inicio (Abre en primera visita o al solicitar cambio de plan/logout)
  const [isInicioModalOpen, setIsInicioModalOpen] = useState<boolean>(() => {
    return !localStorage.getItem('lubo_has_completed_inicio');
  });

  // Local Vault & Session State (Persistent one-time login + subscription)
  const [userSession, setUserSession] = useState<UserSession>(() => LocalVaultService.getUserSession());
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => LocalVaultService.getIngredients());

  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('lubo_theme') === 'dark';
  });

  // Modals State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeFichaProduct, setActiveFichaProduct] = useState<Product | null>(null);
  const [isGroceryListOpen, setIsGroceryListOpen] = useState(false);
  const [isImpactOpen, setIsImpactOpen] = useState(false);

  const [legalModal, setLegalModal] = useState<{
    isOpen: boolean;
    title: string;
    type: 'faq' | 'terms' | 'data' | 'privacy';
  }>({
    isOpen: false,
    title: '',
    type: 'faq',
  });

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('lubo_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('lubo_theme', 'light');
    }
  }, [darkMode]);

  // Toggle Bookmark
  const handleToggleBookmark = (product: Product) => {
    const updatedStatus = !product.isSaved;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, isSaved: updatedStatus } : p))
    );
    if (currentScannedProduct.id === product.id) {
      setCurrentScannedProduct((prev) => ({ ...prev, isSaved: updatedStatus }));
    }
    setHistory((prev) =>
      prev.map((h) =>
        h.productId === product.id
          ? { ...h, product: { ...h.product, isSaved: updatedStatus } }
          : h
      )
    );
  };

  // Add to grocery list
  const handleAddToCart = (product: Product) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, isInList: true, isPurchased: false } : p
      )
    );
  };

  // Toggle purchased in grocery list
  const handleTogglePurchased = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, isPurchased: !p.isPurchased } : p
      )
    );
  };

  // Remove from grocery list
  const handleRemoveFromList = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isInList: false } : p))
    );
  };

  // Add custom item to grocery list
  const handleAddCustomItem = (name: string) => {
    const customProd: Product = {
      id: `custom-${Date.now()}`,
      upc: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      name,
      brand: 'Selección Botica',
      category: 'Despensa Limpia',
      weight: '1 pz',
      priceMxn: 45.0,
      imageUrl: INITIAL_PRODUCTS[1].imageUrl,
      safetyScore: 1.0,
      overallStatus: 'clean',
      statusLabel: '100% Limpio',
      badgeLabel: '0 Aditivos',
      substatusNote: 'Semáforo Óptimo',
      warningSummary: 'Ingrediente verificado por el usuario contra base interna.',
      disruptorCount: 0,
      isSaved: false,
      isInList: true,
      isPurchased: false,
      ingredients: [],
    };
    setProducts((prev) => [customProd, ...prev]);
  };

  // Select scanned product
  const handleProductScanned = (product: Product) => {
    setCurrentScannedProduct(product);
    setActiveTab('escanear');
    // Add to history
    const newEntry: HistoryEntry = {
      id: `hist-${Date.now()}`,
      productId: product.id,
      timestamp: new Date().toISOString(),
      dateGroup: 'today',
      timeLabel: `Ahora · UPC ${product.upc}`,
      product,
    };
    setHistory((prev) => [newEntry, ...prev]);
    setUser((prev) => ({
      ...prev,
      scansCount: prev.scansCount + 1,
      levelPoints: Math.min(prev.maxPoints, prev.levelPoints + 15),
    }));

    // Record scan usage in local vault
    const updated = LocalVaultService.incrementScanUsage();
    setUserSession(updated);
  };

  // Re-scan from history
  const handleReScan = (product: Product) => {
    setCurrentScannedProduct(product);
    setActiveTab('escanear');
  };

  // Clear history
  const handleClearHistory = () => {
    setHistory([]);
  };

  // Export data
  const handleExport = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lubo-botica-analisis-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSaved = () => {
    const saved = products.filter((p) => p.isSaved);
    const dataStr = JSON.stringify(saved, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lubo-favoritos-limpios-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Open Legal Modals
  const handleOpenLegalModal = (
    title: string,
    type: 'faq' | 'terms' | 'data' | 'privacy'
  ) => {
    setLegalModal({
      isOpen: true,
      title,
      type,
    });
  };

  // Confirm Inicio Form (Free / Mensual / Anual selection + payment link)
  const handleConfirmInicio = (data: {
    name: string;
    email: string;
    plan: PlanType;
    membership: string;
    paymentLink?: string;
  }) => {
    const isPaid = data.plan !== 'free';
    const updatedUser: UserProfile = {
      ...user,
      name: data.name,
      email: data.email,
      membership: data.membership,
      tier: isPaid ? 'paid' : 'free',
      planType: data.plan,
      subscriptionActivatedAt: isPaid ? new Date().toISOString() : undefined,
      subscriptionExpiresAt:
        data.plan === 'monthly'
          ? new Date(Date.now() + 30 * 86400000).toISOString()
          : data.plan === 'annual'
          ? new Date(Date.now() + 365 * 86400000).toISOString()
          : undefined,
      paymentLink: data.paymentLink,
    };
    setUser(updatedUser);
    localStorage.setItem('lubo_user_profile', JSON.stringify(updatedUser));
    localStorage.setItem('lubo_has_completed_inicio', 'true');

    // Update Local Vault session
    const updatedSession = LocalVaultService.setSubscriptionPlan(data.plan);
    setUserSession(updatedSession);
    setIsInicioModalOpen(false);
  };

  const savedCount = products.filter((p) => p.isSaved).length;

  return (
    <div className="min-h-screen bg-[#CCE510] dark:bg-[#151908] text-[#341011] dark:text-[#f3f4e8] flex flex-col font-sans relative selection:bg-[#341011] selection:text-[#CCE510] transition-colors duration-200">
      {/* Top Header */}
      <Header onOpenInicioModal={() => setIsInicioModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-16 flex flex-col">
        {activeTab === 'escanear' && (
          <ScanScreen
            currentProduct={currentScannedProduct}
            onOpenLiveScanner={() => setIsCameraOpen(true)}
            onSelectProduct={(p) => setCurrentScannedProduct(p)}
            onToggleBookmark={handleToggleBookmark}
            onOpenFicha={(p) => setActiveFichaProduct(p)}
            allProducts={products}
            onOpenInicioModal={() => setIsInicioModalOpen(true)}
          />
        )}

        {activeTab === 'historial' && (
          <HistoryScreen
            history={history}
            onSelectProduct={(p) => {
              setCurrentScannedProduct(p);
              setActiveTab('escanear');
            }}
            onReScan={handleReScan}
            onToggleBookmark={handleToggleBookmark}
            onClearHistory={handleClearHistory}
            onExport={handleExport}
          />
        )}

        {activeTab === 'guardados' && (
          <SavedScreen
            products={products}
            onOpenFicha={(p) => setActiveFichaProduct(p)}
            onToggleBookmark={handleToggleBookmark}
            onAddToCart={handleAddToCart}
            onOpenGroceryList={() => setIsGroceryListOpen(true)}
            onOpenImpactModal={() => setIsImpactOpen(true)}
            onExportSaved={handleExportSaved}
          />
        )}

        {activeTab === 'perfil' && (
          <ProfileScreen
            user={user}
            onOpenLegalModal={handleOpenLegalModal}
            onUpdateUser={(updated) => {
              setUser((prev) => {
                const nextUser = { ...prev, ...updated };
                localStorage.setItem('lubo_user_profile', JSON.stringify(nextUser));
                return nextUser;
              });
            }}
            onOpenInicioModal={() => setIsInicioModalOpen(true)}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        savedCount={savedCount}
      />

      {/* Camera / Bio-Spectral Viewfinder Modal */}
      <CameraViewfinderModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onProductScanned={handleProductScanned}
        allProducts={products}
        onOpenInicioModal={() => {
          setIsCameraOpen(false);
          setIsInicioModalOpen(true);
        }}
      />

      {/* Ficha Técnica Modal */}
      <FichaTecnicaModal
        product={activeFichaProduct}
        onClose={() => setActiveFichaProduct(null)}
        onToggleBookmark={handleToggleBookmark}
        onAddToCart={handleAddToCart}
      />

      {/* Grocery List Checklist Modal */}
      <GroceryListModal
        isOpen={isGroceryListOpen}
        onClose={() => setIsGroceryListOpen(false)}
        products={products}
        onTogglePurchased={handleTogglePurchased}
        onRemoveFromList={handleRemoveFromList}
        onAddCustomItem={handleAddCustomItem}
      />

      {/* Impact 100% Consciente Modal */}
      <ImpactModal
        isOpen={isImpactOpen}
        onClose={() => setIsImpactOpen(false)}
        avoidedCount={user.toxicsAvoidedCount}
      />

      {/* Legal & Help Modals */}
      <LegalModal
        isOpen={legalModal.isOpen}
        onClose={() => setLegalModal((prev) => ({ ...prev, isOpen: false }))}
        title={legalModal.title}
        type={legalModal.type}
      />

      {/* Formulario de Inicio (Free / Mensual / Anual con Link de Pago en COP) */}
      <InicioFormModal
        isOpen={isInicioModalOpen}
        onClose={() => setIsInicioModalOpen(false)}
        canClose={Boolean(localStorage.getItem('lubo_has_completed_inicio'))}
        initialName={user.name}
        initialEmail={user.email}
        initialPlan={
          user.planType ||
          (user.membership.toLowerCase().includes('anual')
            ? 'annual'
            : user.membership.toLowerCase().includes('free')
            ? 'free'
            : 'monthly')
        }
        onConfirm={handleConfirmInicio}
      />
    </div>
  );
}
