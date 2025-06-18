import BigNumber from 'bignumber.js';

export const calculateUsdCost = (
  fee: number,
  price: BigNumber,
  nativeDecimals: number
): string => {
  const conversionFactor = new BigNumber(10).pow(nativeDecimals);
  return price.multipliedBy(fee).dividedBy(conversionFactor).toString();
};
