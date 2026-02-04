from odoo import models, fields

class ResUsers(models.Model):
    _inherit = 'res.users'

    mfa_secret = fields.Char(string="MFA Secret")
    mfa_enabled = fields.Boolean(string="MFA Enabled", default=False)
