class FormatHelper {
  /**
   * Formata CPF (11 dígitos) ou CNPJ (14 dígitos).
   * @param {string} value
   * @returns {string}
   */
  static formatTaxId(value) {
    const digits = value ? value.replace(/\D/g, '') : '';
    if (digits.length === 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (digits.length === 14) {
      return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  }

  /**
   * Formata número de telefone brasileiro, removendo o sufixo @c.us do WhatsApp
   * e o código do país +55. Retorna no formato (99) 99999-9999 ou (99) 9999-9999.
   * @param {string} value
   * @returns {string|undefined}
   */
  static isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static isValidPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 13;
  }

  static isValidCNPJ(cnpj) {
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;

    const calc = (cnpj, len) => {
      let sum = 0;
      let pos = len - 7;
      for (let i = len; i >= 1; i--) {
        sum += parseInt(cnpj.charAt(len - i)) * pos--;
        if (pos < 2) pos = 9;
      }
      const result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      return result === parseInt(cnpj.charAt(len));
    };

    return calc(cnpj, 12) && calc(cnpj, 13);
  }

  static formatCellphone(value) {
    if (!value) return undefined;
    const digits = value.replace('@c.us', '').replace(/\D/g, '').replace(/^55/, '');
    if (digits.length === 11) {
      return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (digits.length === 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return digits;
  }
}

module.exports = FormatHelper;
