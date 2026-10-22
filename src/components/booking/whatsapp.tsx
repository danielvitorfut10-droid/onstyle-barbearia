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
  const base = input.template?.trim() || "Olá! Fiz um agendamento na OnStyle Barbearia.";
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
  let targetNumber = "";

  // Redirecionamento dinâmico baseado no barbeiro selecionado
  if (lowerBarber.includes("gabriel")) {
    targetNumber = "5519989097315";
  } else if (lowerBarber.includes("romario") || lowerBarber.includes("romário")) {
    targetNumber = "5519992867103";
  } else {
    // Fallback: número informado nas configurações ou Romario
    targetNumber = input.whatsapp ? input.whatsapp.replace(/\D/g, "") : "5519992867103";
    if (targetNumber && !targetNumber.startsWith("55") && targetNumber.length <= 11) {
      targetNumber = `55${targetNumber}`;
    }
    if (!targetNumber) targetNumber = "5519992867103";
  }

  return `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;
}
