export const feedbackTypes = [
  'Bug',
  'Sugestão',
  'Ideia',
  'Melhoria visual',
  'Problema no celular',
  'Problema de conta/login',
  'Problema em ficha',
  'Problema em campanha',
  'Outro'
];

export const feedbackPriorities = ['Baixa', 'Média', 'Alta', 'Urgente'];
export const feedbackStatuses = ['Enviado', 'Em análise', 'Em desenvolvimento', 'Resolvido', 'Recusado'];

// Cada status e um vidro: a cor vem dos Primordiais, sempre com texto claro.
export const statusStyles = {
  Enviado: 'bg-[color-mix(in_srgb,var(--p-ponto)_60%,#000)] text-bone',
  'Em análise': 'bg-[color-mix(in_srgb,var(--p-ananque)_60%,#000)] text-bone',
  'Em desenvolvimento': 'bg-[color-mix(in_srgb,var(--p-eter)_60%,#000)] text-bone',
  Resolvido: 'bg-[color-mix(in_srgb,var(--p-gaia)_60%,#000)] text-bone',
  Recusado: 'bg-[color-mix(in_srgb,var(--p-caos)_60%,#000)] text-bone'
};

export const priorityStyles = {
  Baixa: 'bg-glass text-mist',
  Média: 'bg-[color-mix(in_srgb,var(--p-ponto)_60%,#000)] text-bone',
  Alta: 'bg-[color-mix(in_srgb,var(--p-tartaro)_60%,#000)] text-bone',
  Urgente: 'bg-[color-mix(in_srgb,var(--p-caos)_60%,#000)] text-bone'
};

export function formatFeedbackDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
