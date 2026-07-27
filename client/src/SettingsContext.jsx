import React, { createContext, useContext, useState } from "react";

/* ---------------------------------------------------------
   Contexto global de configurações.
   - businessHours: horário de funcionamento por dia da semana,
     usado para gerar os horários agendáveis (a cada 15 min) na
     hora de criar um pedido.
   - alertThresholds: limite de itens (unidades reais) por
     categoria de produto, por hora, usado para emitir alerta de
     capacidade de produção (ex: "+500 itens de Salgados").
--------------------------------------------------------- */

const SettingsContext = createContext(null);

// Ordem alinhada com Date.getDay() (0 = Domingo ... 6 = Sábado)
export const DAYS_OF_WEEK = [
  { key: "dom", label: "Domingo" },
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sábado" },
];

const defaultBusinessHours = {
  dom: { enabled: false, start: "08:00", end: "13:00" },
  seg: { enabled: true, start: "08:00", end: "18:00" },
  ter: { enabled: true, start: "08:00", end: "18:00" },
  qua: { enabled: true, start: "08:00", end: "18:00" },
  qui: { enabled: true, start: "08:00", end: "18:00" },
  sex: { enabled: true, start: "08:00", end: "18:00" },
  sab: { enabled: true, start: "08:00", end: "13:00" },
};

/** Gera os horários agendáveis a cada `stepMinutes` entre start e end (inclusive). */
function generateTimeSlots(start, end, stepMinutes = 15) {
  if (!start || !end) return [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (Number.isNaN(startMin) || Number.isNaN(endMin) || endMin <= startMin) {
    return [];
  }
  const slots = [];
  for (let t = startMin; t <= endMin; t += stepMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}

export function SettingsProvider({ children }) {
  const [businessHours, setBusinessHours] = useState(defaultBusinessHours);
  const [alertThresholds, setAlertThresholds] = useState({}); // { [categoryKey]: number | "" }
  // Quando ativado, cada novo pedido criado já desconta automaticamente
  // do estoque a quantidade de cada produto envolvido (inclusive dentro
  // de combos). Quando desativado, o estoque continua sendo controlado
  // manualmente na tela de Estoque.
  const [autoDeductStock, setAutoDeductStock] = useState(false);

  /** Liga/desliga a baixa automática de estoque ao criar pedidos. */
  const toggleAutoDeductStock = () => setAutoDeductStock((prev) => !prev);

  /** Atualiza um campo (enabled | start | end) do horário de um dia da semana. */
  const setDayHours = (dayKey, field, value) => {
    setBusinessHours((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [field]: value },
    }));
  };

  /** Define o limite de alerta (itens/hora) de uma categoria. Vazio = sem limite. */
  const setThreshold = (categoryKey, value) => {
    setAlertThresholds((prev) => ({ ...prev, [categoryKey]: value }));
  };

  const getDayKeyFromISO = (iso) => {
    if (!iso) return null;
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return DAYS_OF_WEEK[d.getDay()].key;
  };

  /** Retorna os horários agendáveis (a cada 15 min) para uma data ISO, ou [] se fechado. */
  const getSlotsForDate = (iso) => {
    const dayKey = getDayKeyFromISO(iso);
    if (!dayKey) return [];
    const day = businessHours[dayKey];
    if (!day || !day.enabled) return [];
    return generateTimeSlots(day.start, day.end);
  };

  return (
    <SettingsContext.Provider
      value={{
        businessHours,
        setDayHours,
        alertThresholds,
        setThreshold,
        getDayKeyFromISO,
        getSlotsForDate,
        autoDeductStock,
        toggleAutoDeductStock,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings precisa ser usado dentro de <SettingsProvider>");
  }
  return ctx;
}
