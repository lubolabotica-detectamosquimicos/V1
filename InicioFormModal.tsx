import React, { useState } from 'react';
import { LUBO_LOGO_URL } from '../data/mockData';
import { PlanType } from '../types';

export type { PlanType };

interface InicioFormModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canClose?: boolean;
  initialName?: string;
  initialEmail?: string;
  initialPlan?: PlanType;
  onConfirm: (data: {
    name: string;
    email: string;
    plan: PlanType;
    membership: string;
    paymentLink?: string;
  }) => void;
}

const DEFAULT_PAYMENT_LINKS: Record<'monthly' | 'annual' | 'help', string> = {
  monthly: 'https://mpago.li/1TxnQQk',
  annual: 'https://mpago.li/1uCi2kF',
  help: 'https://link.mercadopago.com.co/graciasporayudarnos',
};

export const InicioFormModal: React.FC<InicioFormModalProps> = ({
  isOpen,
  onClose,
  canClose = true,
  initialName = 'Camila Valenzuela',
  initialEmail = 'lubo.labotica@gmail.com',
  initialPlan = 'monthly',
  onConfirm,
}) => {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(initialPlan);
  const [monthlyLink, setMonthlyLink] = useState(DEFAULT_PAYMENT_LINKS.monthly);
  const [annualLink, setAnnualLink] = useState(DEFAULT_PAYMENT_LINKS.annual);
  const [helpLink, setHelpLink] = useState(DEFAULT_PAYMENT_LINKS.help);
  const [editingLinkPlan, setEditingLinkPlan] = useState<'monthly' | 'annual' | null>(null);
  const [copiedLink, setCopiedLink] = useState<'monthly' | 'annual' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyLink = (plan: 'monthly' | 'annual') => {
    const link = plan === 'monthly' ? monthlyLink : annualLink;
    try {
      navigator.clipboard.writeText(link);
      setCopiedLink(plan);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      setCopiedLink(plan);
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  const getMembershipTitle = (plan: PlanType): string => {
    switch (plan) {
      case 'monthly':
        return 'Plan Mensual';
      case 'annual':
        return 'Plan Anual';
      case 'free':
      default:
        return 'Plan Free';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Por favor ingresa tu nombre');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Por favor ingresa un correo electrónico válido');
      return;
    }

    const membershipText = getMembershipTitle(selectedPlan);
    const chosenPaymentLink =
      selectedPlan === 'monthly'
        ? monthlyLink
        : selectedPlan === 'annual'
        ? annualLink
        : undefined;

    onConfirm({
      name: name.trim(),
      email: email.trim(),
      plan: selectedPlan,
      membership: membershipText,
      paymentLink: chosenPaymentLink,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#1a220a] rounded-3xl shadow-2xl border border-[#cce510]/60 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header con gradiente Botica */}
        <div className="bg-gradient-to-r from-[#341011] to-[#4e1c1e] text-white p-4 sm:p-5 relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white p-1 shadow-md ring-2 ring-[#cce510] shrink-0">
              <img
                src={LUBO_LOGO_URL}
                alt="LuBo la botica"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#cce510] bg-[#cce510]/15 px-2 py-0.5 rounded-full">
                  Formulario de Inicio
                </span>
                <span className="text-[10px] font-bold text-white/80">
                  · Valores en Pesos Colombianos (COP)
                </span>
              </div>
              <h2 className="text-[18px] sm:text-[21px] font-bold text-white leading-snug">
                LuBo la botica
              </h2>
              <p className="text-[11px] text-[#f3f4e8]/80">
                Comparativa de planes y personalización de acceso
              </p>
            </div>
            {canClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Cerrar"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Form Body con Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-100 text-red-800 text-[12px] font-medium border border-red-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Datos del Usuario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#341011] dark:text-[#cce510] mb-1">
                Nombre
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#464833]/60 dark:text-white/60">
                  person
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Tu nombre completo"
                  className="w-full pl-10 pr-3 py-2 bg-[#f6f7f2] dark:bg-white/5 border border-[#341011]/15 dark:border-white/10 rounded-xl text-[12px] text-[#1a1c1c] dark:text-white font-medium outline-none focus:border-[#cce510] focus:ring-2 focus:ring-[#cce510]/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#341011] dark:text-[#cce510] mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#464833]/60 dark:text-white/60">
                  mail
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="ejemplo@correo.com"
                  className="w-full pl-10 pr-3 py-2 bg-[#f6f7f2] dark:bg-white/5 border border-[#341011]/15 dark:border-white/10 rounded-xl text-[12px] text-[#1a1c1c] dark:text-white font-medium outline-none focus:border-[#cce510] focus:ring-2 focus:ring-[#cce510]/30 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Tabla / Grid Comparativo de los 3 Planes con características alineadas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#341011] dark:text-[#cce510]">
                Comparativa de Planes (Pesos Colombianos - COP)
              </label>
              <span className="text-[10px] font-extrabold text-[#586400] dark:text-[#cce510] bg-[#cce510]/15 px-2 py-0.5 rounded-full">
                Elige tu opción
              </span>
            </div>

            {/* Grid Comparativo de 3 columnas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* PLAN 1: PLAN FREE */}
              <div
                onClick={() => setSelectedPlan('free')}
                className={`cursor-pointer rounded-2xl border-2 transition-all flex flex-col justify-between overflow-hidden ${
                  selectedPlan === 'free'
                    ? 'border-[#586400] bg-[#cce510]/10 dark:bg-[#cce510]/10 shadow-md ring-2 ring-[#586400]'
                    : 'border-[#341011]/10 dark:border-white/10 bg-[#f9f9f7] dark:bg-white/5 hover:border-[#341011]/30'
                }`}
              >
                {/* Cabecera del Plan */}
                <div className="p-3.5 border-b border-[#341011]/10 dark:border-white/10 bg-black/[0.02]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#341011]/10 dark:bg-white/10 text-[#341011] dark:text-white">
                      Básico
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedPlan === 'free'
                          ? 'border-[#586400] bg-[#586400] text-white'
                          : 'border-gray-400 bg-transparent'
                      }`}
                    >
                      {selectedPlan === 'free' && (
                        <span className="material-symbols-outlined text-[11px] font-bold">check</span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-[14px] font-bold text-[#1a1c1c] dark:text-white">
                    Plan Free
                  </h3>
                  <div className="mt-1">
                    <span className="text-[18px] font-black text-[#341011] dark:text-[#cce510]">
                      $0 COP
                    </span>
                    <span className="text-[10px] text-[#464833] dark:text-white/60 ml-1">
                      / siempre
                    </span>
                  </div>
                </div>

                {/* Filas Comparativas Alineadas */}
                <div className="p-3.5 space-y-2.5 text-[11px] flex-1">
                  {/* Fila 1: Escaneos con cámara */}
                  <div className="min-h-[38px] flex items-center gap-1.5 border-b border-[#341011]/5 dark:border-white/5 pb-2">
                    <span className="material-symbols-outlined text-[15px] text-[#586400] dark:text-[#cce510] shrink-0">
                      photo_camera
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Escaneos de cámara
                      </div>
                      <div className="font-semibold text-[#1a1c1c] dark:text-white">
                        2 escaneos semanales
                      </div>
                    </div>
                  </div>

                  {/* Fila 2: Introducir ingredientes */}
                  <div className="min-h-[38px] flex items-center gap-1.5 border-b border-[#341011]/5 dark:border-white/5 pb-2">
                    <span className="material-symbols-outlined text-[15px] text-[#2A8743] shrink-0">
                      check_circle
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Introducir ingredientes
                      </div>
                      <div className="font-semibold text-[#2A8743] dark:text-[#a1e687]">
                        Ilimitado
                      </div>
                    </div>
                  </div>

                  {/* Fila 3: Respuesta del semáforo */}
                  <div className="min-h-[38px] flex items-center gap-1.5 border-b border-[#341011]/5 dark:border-white/5 pb-2">
                    <span className="material-symbols-outlined text-[15px] text-[#2A8743] shrink-0">
                      traffic
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Respuesta del semáforo
                      </div>
                      <div className="font-semibold text-[#2A8743] dark:text-[#a1e687]">
                        Ilimitada
                      </div>
                    </div>
                  </div>

                  {/* Fila 4: Alternativas LuBo */}
                  <div className="min-h-[38px] flex items-center gap-1.5 border-b border-[#341011]/5 dark:border-white/5 pb-2">
                    <span className="material-symbols-outlined text-[15px] text-[#2A8743] shrink-0">
                      spa
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Alternativas LuBo
                      </div>
                      <div className="font-semibold text-[#2A8743] dark:text-[#a1e687]">
                        Ilimitadas
                      </div>
                    </div>
                  </div>

                  {/* Fila 5: Precaución bioquímica */}
                  <div className="min-h-[38px] flex items-center gap-1.5 border-b border-[#341011]/5 dark:border-white/5 pb-2">
                    <span className="material-symbols-outlined text-[15px] text-[#586400] dark:text-[#cce510] shrink-0">
                      science
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Precaución bioquímica
                      </div>
                      <div className="font-semibold text-[#1a1c1c] dark:text-white">
                        Básica
                      </div>
                    </div>
                  </div>

                  {/* Fila 6: Ahorro */}
                  <div className="min-h-[36px] flex items-center gap-1.5 text-[#464833]/60 dark:text-white/40">
                    <span className="material-symbols-outlined text-[15px] shrink-0">
                      remove
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Ahorro adicional
                      </div>
                      <div className="font-medium">—</div>
                    </div>
                  </div>
                </div>

                {/* Botón debajo del Plan Free */}
                <div className="p-3 bg-black/[0.03] dark:bg-white/[0.03] border-t border-[#341011]/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan('free');
                    }}
                    className={`w-full py-2.5 px-3 rounded-xl text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      selectedPlan === 'free'
                        ? 'bg-[#586400] text-white shadow-sm ring-1 ring-[#586400]'
                        : 'bg-white dark:bg-white/10 hover:bg-[#cce510]/20 text-[#341011] dark:text-white border border-[#341011]/20 dark:border-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {selectedPlan === 'free' ? 'check' : 'touch_app'}
                    </span>
                    <span>
                      {selectedPlan === 'free'
                        ? '✓ Plan Free Elegido'
                        : 'Elegir Plan Free'}
                    </span>
                  </button>
                </div>
              </div>

              {/* PLAN 2: PLAN MENSUAL */}
              <div
                onClick={() => setSelectedPlan('monthly')}
                className={`cursor-pointer rounded-2xl border-2 transition-all flex flex-col justify-between overflow-hidden ${
                  selectedPlan === 'monthly'
                    ? 'border-[#341011] dark:border-[#cce510] bg-[#cce510]/15 dark:bg-[#cce510]/10 shadow-md ring-2 ring-[#cce510]'
                    : 'border-[#341011]/10 dark:border-white/10 bg-[#f9f9f7] dark:bg-white/5 hover:border-[#341011]/30'
                }`}
              >
                {/* Cabecera del Plan */}
                <div className="p-3.5 border-b border-[#341011]/10 dark:border-white/10 bg-black/[0.02]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#341011] text-[#cce510]">
                      Popular
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedPlan === 'monthly'
                          ? 'border-[#341011] dark:border-[#cce510] bg-[#341011] dark:bg-[#cce510] text-[#cce510] dark:text-[#341011]'
                          : 'border-gray-400 bg-transparent'
                      }`}
                    >
                      {selectedPlan === 'monthly' && (
                        <span className="material-symbols-outlined text-[11px] font-bold">check</span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-[14px] font-bold text-[#1a1c1c] dark:text-white">
                    Plan Mensual
                  </h3>
                  <div className="mt-1">
                    <span className="text-[18px] font-black text-[#341011] dark:text-[#cce510]">
                      $6.500 COP
                    </span>
                    <span className="text-[10px] text-[#464833] dark:text-white/60 ml-1">
                      / mes
                    </span>
                  </div>
                </div>

                {/* Filas Comparativas Alineadas */}
                <div className="p-3.5 space-y-2.5 text-[11px] flex-1">
                  {/* Fila 1: Escaneos con cámara */}
                  <div className="min-h-[38px] flex items-center gap-1.5 border-b border-[#341011]/5 dark:border-white/5 pb-2">
                    <span className="material-symbols-outlined text-[15px] text-[#2A8743] dark:text-[#cce510] shrink-0">
                      verified
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Escaneos de cámara
                      </div>
                      <div className="font-semibold text-[#1a1c1c] dark:text-white">
                        Escaneos ilimitados
                      </div>
                    </div>
                  </div>

                  {/* Fila 2: Introducir ingredientes */}
                  <div className="min-h-[38px] flex items-center gap-1.5 border-b border-[#341011]/5 dark:border-white/5 pb-2">
                    <span className="material-symbols-outlined text-[15px] text-[#2A8743] shrink-0">
                      check_circle
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Introducir ingredientes
                      </div>
                      <div className="font-semibold text-[#2A8743] dark:text-[#a1e687]">
                        Ilimitado
                      </div>
                    </div>
                  </div>

                  {/* Fila 3: Respuesta del semáforo */}
                  <div className="min-h-[38px] flex items-center gap-1.5 border-b border-[#341011]/5 dark:border-white/5 pb-2">
                    <span className="material-symbols-outlined text-[15px] text-[#2A8743] shrink-0">
                      traffic
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Respuesta del semáforo
                      </div>
                      <div className="font-semibold text-[#2A8743] dark:text-[#a1e687]">
                        Ilimitada
                      </div>
                    </div>
                  </div>

                  {/* Fila 4: Alternativas LuBo */}
                  <div className="min-h-[38px] flex items-center gap-1.5 border-b border-[#341011]/5 dark:border-white/5 pb-2">
                    <span className="material-symbols-outlined text-[15px] text-[#2A8743] shrink-0">
                      spa
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Alternativas LuBo
                      </div>
                      <div className="font-semibold text-[#2A8743] dark:text-[#a1e687]">
                        Ilimitadas
                      </div>
                    </div>
                  </div>

                  {/* Fila 5: Precaución bioquímica */}
                  <div className="min-h-[38px] flex items-center gap-1.5 border-b border-[#341011]/5 dark:border-white/5 pb-2">
                    <span className="material-symbols-outlined text-[15px] text-[#2A8743] dark:text-[#cce510] shrink-0">
                      science
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Precaución bioquímica
                      </div>
                      <div className="font-semibold text-[#1a1c1c] dark:text-white">
                        Completa
                      </div>
                    </div>
                  </div>

                  {/* Fila 6: Ahorro */}
                  <div className="min-h-[36px] flex items-center gap-1.5 text-[#464833]/60 dark:text-white/40">
                    <span className="material-symbols-outlined text-[15px] shrink-0">
                      remove
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Ahorro adicional
                      </div>
                      <div className="font-medium">—</div>
                    </div>
                  </div>
                </div>

                {/* Botones debajo del Plan Mensual: Link de pago y Selección */}
                <div className="p-3 bg-black/[0.03] dark:bg-white/[0.03] border-t border-[#341011]/10 dark:border-white/10 space-y-2">
                  {/* Link de Pago directo Mensual */}
                  <a
                    href={monthlyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-full py-2 px-3 rounded-xl bg-[#341011] hover:bg-[#4a1819] text-[#cce510] text-[11.5px] font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
                  >
                    <span className="material-symbols-outlined text-[15px]">credit_card</span>
                    <span>Pagar $6.500 COP</span>
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  </a>

                  {/* Botón de Selección */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan('monthly');
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      selectedPlan === 'monthly'
                        ? 'bg-[#cce510] text-[#341011] shadow-xs'
                        : 'bg-white dark:bg-white/10 hover:bg-[#cce510]/20 text-[#341011] dark:text-white border border-[#341011]/15 dark:border-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {selectedPlan === 'monthly' ? 'check' : 'touch_app'}
                    </span>
                    <span>
                      {selectedPlan === 'monthly'
                        ? '✓ Plan Mensual Elegido'
                        : 'Elegir Plan Mensual'}
                    </span>
                  </button>

                  {/* Acciones de link mensual (copiar / editar) */}
                  <div className="flex items-center justify-between text-[10px] pt-0.5 px-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLink('monthly');
                      }}
                      className="text-[#586400] dark:text-[#cce510] hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        {copiedLink === 'monthly' ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedLink === 'monthly' ? '¡Copiado!' : 'Copiar link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingLinkPlan(editingLinkPlan === 'monthly' ? null : 'monthly');
                      }}
                      className="text-[#464833] dark:text-white/60 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[12px]">tune</span>
                      <span>Editar</span>
                    </button>
                  </div>

                  {editingLinkPlan === 'monthly' && (
                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="url"
                        value={monthlyLink}
                        onChange={(e) => setMonthlyLink(e.target.value)}
                        placeholder="Link de pago mensual (Wompi, Bold, etc.)"
                        className="w-full px-2 py-1 bg-white dark:bg-black/30 border border-[#341011]/20 dark:border-white/15 rounded-lg text-[10px] text-[#1a1c1c] dark:text-white outline-none focus:border-[#cce510]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* PLAN 3: PLAN ANUAL */}
              <div
                onClick={() => setSelectedPlan('annual')}
                className={`cursor-pointer rounded-2xl border-2 transition-all flex flex-col justify-between overflow-hidden ${
                  selectedPlan === 'annual'
                    ? 'border-[#2A8743] dark:border-[#cce510] bg-[#2A8743]/15 dark:bg-[#cce510]/15 shadow-md ring-2 ring-[#2A8743]'
                    : 'border-[#341011]/10 dark:border-white/10 bg-[#f9f9f7] dark:bg-white/5 hover:border-[#341011]/30'
                }`}
              >
                {/* Cabecera del Plan */}
                <div className="p-3.5 border-b border-[#341011]/10 dark:border-white/10 bg-black/[0.02]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#2A8743] text-white">
                      ⭐ Mejor Valor
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedPlan === 'annual'
                          ? 'border-[#2A8743] bg-[#2A8743] text-white'
                          : 'border-gray-400 bg-transparent'
                      }`}
                    >
                      {selectedPlan === 'annual' && (
                        <span className="material-symbols-outlined text-[11px] font-bold">check</span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-[14px] font-bold text-[#1a1c1c] dark:text-white">
                    Plan Anual
                  </h3>
                  <div className="mt-1">
                    <span className="text-[18px] font-black text-[#2A8743] dark:text-[#cce510]">
                      $30.000 COP
                    </span>
                    <span className="text-[10px] text-[#464833] dark:text-white/60 ml-1">
                      / año
                    </span>
                  </div>
                </div>

                {/* Filas Comparativas Alineadas */}
                <div className="p-3.5 space-y-2.5 text-[11px] flex-1">
                  {/* Fila 1: Escaneos con cámara */}
                  <div className="min-h-[38px] flex items-center gap-1.5 border-b border-[#341011]/5 dark:border-white/5 pb-2">
                    <span className="material-symbols-outlined text-[15px] text-[#2A8743] dark:text-[#cce510] shrink-0">
                      verified
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Escaneos de cámara
                      </div>
                      <div className="font-semibold text-[#1a1c1c] dark:text-white">
                        Escaneos ilimitados
                      </div>
                    </div>
                  </div>

                  {/* Fila 2: Introducir ingredientes */}
                  <div className="min-h-[38px] flex items-center gap-1.5 border-b border-[#341011]/5 dark:border-white/5 pb-2">
                    <span className="material-symbols-outlined text-[15px] text-[#2A8743] shrink-0">
                      check_circle
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Introducir ingredientes
                      </div>
                      <div className="font-semibold text-[#2A8743] dark:text-[#a1e687]">
                        Ilimitado
                      </div>
                    </div>
                  </div>

                  {/* Fila 3: Respuesta del semáforo */}
                  <div className="min-h-[38px] flex items-center gap-1.5 border-b border-[#341011]/5 dark:border-white/5 pb-2">
                    <span className="material-symbols-outlined text-[15px] text-[#2A8743] shrink-0">
                      traffic
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Respuesta del semáforo
                      </div>
                      <div className="font-semibold text-[#2A8743] dark:text-[#a1e687]">
                        Ilimitada
                      </div>
                    </div>
                  </div>

                  {/* Fila 4: Alternativas LuBo */}
                  <div className="min-h-[38px] flex items-center gap-1.5 border-b border-[#341011]/5 dark:border-white/5 pb-2">
                    <span className="material-symbols-outlined text-[15px] text-[#2A8743] shrink-0">
                      spa
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Alternativas LuBo
                      </div>
                      <div className="font-semibold text-[#2A8743] dark:text-[#a1e687]">
                        Ilimitadas
                      </div>
                    </div>
                  </div>

                  {/* Fila 5: Precaución bioquímica */}
                  <div className="min-h-[38px] flex items-center gap-1.5 border-b border-[#341011]/5 dark:border-white/5 pb-2">
                    <span className="material-symbols-outlined text-[15px] text-[#2A8743] dark:text-[#cce510] shrink-0">
                      science
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#464833]/70 dark:text-white/50">
                        Precaución bioquímica
                      </div>
                      <div className="font-semibold text-[#1a1c1c] dark:text-white">
                        Completa
                      </div>
                    </div>
                  </div>

                  {/* Fila 6: Ahorro Promocional */}
                  <div className="min-h-[36px] flex items-center gap-1.5 text-[#2A8743] dark:text-[#a1e687]">
                    <span className="material-symbols-outlined text-[15px] shrink-0 font-bold">
                      savings
                    </span>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-[#2A8743]/80 dark:text-[#cce510]">
                        Ahorro adicional
                      </div>
                      <div className="font-extrabold text-[11px]">
                        ¡Ahorras 61% ($48.000 COP al año)!
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botones debajo del Plan Anual: Link de pago y Selección */}
                <div className="p-3 bg-black/[0.03] dark:bg-white/[0.03] border-t border-[#341011]/10 dark:border-white/10 space-y-2">
                  {/* Link de Pago directo Anual */}
                  <a
                    href={annualLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-full py-2 px-3 rounded-xl bg-[#341011] hover:bg-[#4a1819] text-[#cce510] text-[11.5px] font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
                    title="Pagar suscripción anual de $30.000 COP"
                  >
                    <span className="material-symbols-outlined text-[15px]">credit_card</span>
                    <span>Pagar $30.000 COP</span>
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  </a>

                  {/* Botón de Selección */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan('annual');
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      selectedPlan === 'annual'
                        ? 'bg-[#2A8743] text-white shadow-xs'
                        : 'bg-white dark:bg-white/10 hover:bg-[#2A8743]/15 text-[#341011] dark:text-white border border-[#341011]/15 dark:border-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {selectedPlan === 'annual' ? 'check' : 'touch_app'}
                    </span>
                    <span>
                      {selectedPlan === 'annual'
                        ? '✓ Plan Anual Elegido'
                        : 'Elegir Plan Anual'}
                    </span>
                  </button>

                  {/* Acciones de link anual (copiar / editar) */}
                  <div className="flex items-center justify-between text-[10px] pt-0.5 px-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLink('annual');
                      }}
                      className="text-[#2A8743] dark:text-[#cce510] hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        {copiedLink === 'annual' ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedLink === 'annual' ? '¡Copiado!' : 'Copiar link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingLinkPlan(editingLinkPlan === 'annual' ? null : 'annual');
                      }}
                      className="text-[#464833] dark:text-white/60 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[12px]">tune</span>
                      <span>Editar</span>
                    </button>
                  </div>

                  {editingLinkPlan === 'annual' && (
                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="url"
                        value={annualLink}
                        onChange={(e) => setAnnualLink(e.target.value)}
                        placeholder="Link de pago anual (Wompi, Bold, etc.)"
                        className="w-full px-2 py-1 bg-white dark:bg-black/30 border border-[#341011]/20 dark:border-white/15 rounded-lg text-[10px] text-[#1a1c1c] dark:text-white outline-none focus:border-[#2A8743]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cuadro unificado de Ayuda y Aporte Voluntario */}
            <div className="mt-3">
              <a
                href={helpLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group w-full p-2.5 sm:p-3 rounded-2xl bg-[#2A8743]/10 dark:bg-[#cce510]/10 hover:bg-[#2A8743]/15 dark:hover:bg-[#cce510]/20 border border-[#2A8743]/30 dark:border-[#cce510]/30 flex flex-col sm:flex-row items-center justify-between gap-2.5 transition-all duration-200 active:scale-[0.99] text-center sm:text-left shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#2A8743] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">volunteer_activism</span>
                  </div>
                  <span className="text-[11.5px] sm:text-[12px] font-black uppercase tracking-tight text-[#1a1c1c] dark:text-white">
                    AYUDANOS PARA SEGUIR TRABAJANDO POR TI
                  </span>
                </div>

                <div className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-full bg-[#2A8743] group-hover:bg-[#236e37] text-white text-[11px] font-black uppercase tracking-tight shadow-xs transition-colors shrink-0">
                  <span className="material-symbols-outlined text-[15px]">favorite</span>
                  <span>APORTE VOLUNTARIO</span>
                  <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                </div>
              </a>
            </div>
          </div>

          {/* Botón Principal de Envío / Confirmación */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-full bg-[#341011] hover:bg-[#4a1819] text-[#cce510] text-[13.5px] font-extrabold shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>
                {selectedPlan === 'free'
                  ? 'Guardar y Continuar con Plan Free ($0 COP)'
                  : selectedPlan === 'monthly'
                  ? 'Guardar y Continuar con Plan Mensual ($6.500 COP)'
                  : 'Guardar y Continuar con Plan Anual ($30.000 COP)'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
