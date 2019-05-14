const request = require('request-promise-native')

class LN {
  constructor(baseUrl, macaroon) {
    this._baseUrl = baseUrl
    this._macaroon = macaroon
    this._baseOptions = {
      // Work-around for self-signed certificates.
      rejectUnauthorized: false,
      json: true,
      headers: {
        'Grpc-Metadata-macaroon': this._macaroon
      }
    }
  }

  async getInfo() {
    return request.get({
      ...this._baseOptions,
      json: true,
      url: `${this._baseUrl}/getinfo`
    })
  }

  async addInvoice(value, memo, preimage) {
    return request.post({
      ...this._baseOptions,
      json: true,
      body: { value, memo, r_preimage: Buffer.from(preimage, 'hex').toString('base64') },
      url: `${this._baseUrl}/invoices`
    })
  }
  
  async payInvoice(payment_request) {
    return request.post({
      ...this._baseOptions,
      json: true,
      body: { payment_request },
      url: `${this._baseUrl}/channels/transactions`
    })
  }
}

module.exports = LN