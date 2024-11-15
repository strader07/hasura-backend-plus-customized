import { asyncWrapper, selectAccountByUserId } from '@shared/helpers'
import { RequestExtended, AccountData } from '@shared/types'
import { Response } from 'express'
import { sendSms } from '@shared/sns'
import { authenticator } from 'otplib'
import { verificationMsg } from '.'

async function resendSms(req: RequestExtended, res: Response): Promise<unknown> {
  try {
    if (!req.permission_variables) {
      return res.boom.unauthorized('Not logged in')
    }

    const { 'user-id': user_id } = req.permission_variables
    let sms_otp_secret: AccountData['sms_otp_secret']
    let phone_number: AccountData['phone_number']
    try {
      const account = await selectAccountByUserId(user_id)
      console.log('account: ', account)
      sms_otp_secret = account.sms_otp_secret
      phone_number = account.phone_number
    } catch (err) {
      return res.boom.badRequest(err.message)
    }

    if (!sms_otp_secret) {
      return res.boom.badRequest('SMS OTP secret is not set.')
    }

    if (!phone_number) {
      return res.boom.badRequest('Phone number is not set.')
    }

    /**
     * Generate code and send via SMS
     */
    const code = authenticator.generate(sms_otp_secret)
    await sendSms(phone_number, verificationMsg(code))
    return res.status(204).send()
  } catch (e) {
    console.log('e: ', e)
    return res.status(500).send()
  }
}

export default asyncWrapper(resendSms)
