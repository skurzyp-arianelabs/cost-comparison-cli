export const dataHeaderFormat = {
  backgroundColor: {
    red: 0.7176471,
    green: 0.7176471,
    blue: 0.7176471
  },
  horizontalAlignment: 'CENTER',
  wrapStrategy: 'WRAP',
  textFormat: {
    bold: true
  },
  borders: {
    top: {
      style: 'SOLID',
      width: 1
    },
    bottom: {
      style: 'SOLID',
      width: 1
    },
    left: {
      style: 'SOLID',
      width: 1
    },
    right: {
      style: 'SOLID',
      width: 1
    }
  }
};

export const sectionHeaderFormat = {
  backgroundColor: {
    red: 0.9372549,
    green: 0.9372549,
    blue: 0.9372549
  },
  textFormat: {
    bold: true
  }
};

export const veryExpensiveFormat = {
  backgroundColor: {
    red: 0.21960784,
    green: 0.4627451,
    blue: 0.11372549
  },
  horizontalAlignment: 'CENTER',
  wrapStrategy: 'WRAP',
  textFormat: {
    bold: false,
    foregroundColor: {
      red: 1,
      green: 1,
      blue: 1
    }
  }
}

export const expensiveFormat = {
  backgroundColor: {
    red: 0.5764706,
    green: 0.76862746,
    blue: 0.49019608
  },
  horizontalAlignment: 'CENTER',
  wrapStrategy: 'WRAP',
  textFormat: {
    bold: false
  }
}

export const cheaperFormat = {
  backgroundColor: {
    red: 0.91764706,
    green: 0.6,
    blue: 0.6
  },
  horizontalAlignment: 'CENTER',
  wrapStrategy: 'WRAP',
  textFormat: {
    bold: false
  }
}

export const veryCheapFormat = {
  backgroundColor: {
    red: 0.8,
    green: 0,
    blue: 0
  },
  horizontalAlignment: 'CENTER',
  wrapStrategy: 'WRAP',
  textFormat: {
    bold: false,
    foregroundColor: {
      red: 1,
      green: 1,
      blue: 1
    }
  }
}

export const nanFormat = {
  numberFormat: {
    type: 'TEXT'
  },
  borders: {
    top: {
      style: 'SOLID',
      width: 1
    },
    bottom: {
      style: 'SOLID',
      width: 1
    },
    left: {
      style: 'SOLID',
      width: 1
    },
    right: {
      style: 'SOLID',
      width: 1
    }
  },
  horizontalAlignment: 'CENTER',
  textFormat: {
    fontFamily: 'Roboto Mono'
  }
};

export const equalPriceFormat = {
  numberFormat: {
    type: 'CURRENCY',
    pattern: '[$$]#,##0.000000000'
  },
  borders: {
    top: {
      style: 'SOLID',
      width: 1
    },
    bottom: {
      style: 'SOLID',
      width: 1
    },
    left: {
      style: 'SOLID',
      width: 1
    },
    right: {
      style: 'SOLID',
      width: 1
    }
  },
  horizontalAlignment: 'RIGHT',
  textFormat: {
    fontFamily: "Roboto Mono"
  }
}

export const veryExpensivePriceFormat = {
  ...veryExpensiveFormat,
  numberFormat: equalPriceFormat.numberFormat,
  borders: equalPriceFormat.borders,
  horizontalAlignment: equalPriceFormat.horizontalAlignment,
  textFormat: {
    ...veryExpensiveFormat.textFormat,
    ...equalPriceFormat.textFormat
  }
};

export const expensivePriceFormat = {
  ...expensiveFormat,
  numberFormat: equalPriceFormat.numberFormat,
  borders: equalPriceFormat.borders,
  horizontalAlignment: equalPriceFormat.horizontalAlignment,
  textFormat: {
    ...expensiveFormat.textFormat,
    ...equalPriceFormat.textFormat
  }
};

export const cheaperPriceFormat = {
  ...cheaperFormat,
  numberFormat: equalPriceFormat.numberFormat,
  borders: equalPriceFormat.borders,
  horizontalAlignment: equalPriceFormat.horizontalAlignment,
  textFormat: {
    ...cheaperFormat.textFormat,
    ...equalPriceFormat.textFormat
  }
};

export const veryCheapPriceFormat = {
  ...veryCheapFormat,
  numberFormat: equalPriceFormat.numberFormat,
  borders: equalPriceFormat.borders,
  horizontalAlignment: equalPriceFormat.horizontalAlignment,
  textFormat: {
    ...veryCheapFormat.textFormat,
    ...equalPriceFormat.textFormat
  }
};

