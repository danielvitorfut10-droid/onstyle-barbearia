export function buildWhatsappLink(input: {
  whatsapp: string;
  template: string | null;
  clientName: string;
  barberName: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  priceLabel: string;
}) {
  const base = input.template?.trim() || "Olá! Fiz um agendamento no Studio Blackout.";
  const message = [
    base,
    "",
    `Cliente: ${input.clientName}`,
    `Barbeiro: ${input.barberName}`,
    `Serviço: ${input.serviceName}`,
    `Data: ${input.dateLabel}`,
    `Horário: ${input.timeLabel}`,
    `Valor: ${input.priceLabel}`,
  ].join("\n");

  const lowerBarber = (input.barberName || "").toLowerCase();
  let targetNumber = input.whatsapp ? input.whatsapp.replace(/\D/g, "") : "";

  // Redirecionamento dinâmico baseado no barbeiro selecionado
  if (lowerBarber.includes("rian")) {
    targetNumber = "5519920037087";
  } else if (lowerBarber.includes("lemuel") || lowerBarber.includes("lemoel")) {
    targetNumber = "5519986078202";
  } else if (targetNumber && !targetNumber.startsWith("55") && targetNumber.length <= 11) {
    targetNumber = `55${targetNumber}`;
  }

  return `https://wa.me/${targetNumber || "5519920037087"}?text=${encodeURIComponent(message)}`;
}
