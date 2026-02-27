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
