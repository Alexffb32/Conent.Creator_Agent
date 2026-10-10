/** Preços para mostrar na interface. Valores vêm de configuração (nunca fixos no código de negócio). */
export const pricing = {
  installEur: Number(process.env.NEXT_PUBLIC_PRICE_INSTALL_EUR ?? 490),
  monthlyEur: Number(process.env.NEXT_PUBLIC_PRICE_MONTHLY_EUR ?? 99),
  adFreeEur: Number(process.env.NEXT_PUBLIC_PRICE_AD_FREE_EUR ?? 2.99),
};

export const eur = (n: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n);
