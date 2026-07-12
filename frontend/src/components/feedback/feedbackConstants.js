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

export const statusStyles = {
  Enviado: 'border-blue-300/30 bg-blue-950/25 text-blue-100',
  'Em análise': 'border-amber-300/35 bg-amber-950/25 text-amber-100',
  'Em desenvolvimento': 'border-purple-300/35 bg-purple-950/30 text-purple-100',
  Resolvido: 'border-emerald-300/35 bg-emerald-950/25 text-emerald-100',
  Recusado: 'border-red-300/35 bg-red-950/30 text-red-100'
};

export const priorityStyles = {
  Baixa: 'border-slate-300/25 bg-slate-900/40 text-slate-100',
  Média: 'border-blue-300/25 bg-blue-950/25 text-blue-100',
  Alta: 'border-orange-300/30 bg-orange-950/25 text-orange-100',
  Urgente: 'border-red-300/35 bg-red-950/35 text-red-100'
};

export function formatFeedbackDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
