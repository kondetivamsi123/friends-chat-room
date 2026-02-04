from odoo import http, fields
from odoo.http import request
import json
import logging
import datetime

_logger = logging.getLogger(__name__)

class MfaChatController(http.Controller):

    # ==========================
    # AUTHENTICATION & MFA
    # ==========================

    @http.route('/api/auth/login', type='json', auth='none', csrf=False, cors='*')
    def auth_login(self, login, password, db=None):
        """
        Authenticates user. 
        If valid, checks if MFA is enabled.
        Returns check_mfa=True if intermediate step needed, else returns session.
        """
        try:
            # Logic to resolve DB:
            # 1. Use passed 'db'
            # 2. Use request.db if set (from cookie/host)
            # 3. If mono-db mode, list_dbs and pick one.
            database = db or request.db
            if not database:
                dbs = http.db_list(force=True)
                if len(dbs) == 1:
                    database = dbs[0]
                elif len(dbs) > 1:
                    return {'error': 'Multiple databases found. Please specify db.'}
                else: 
                     return {'error': 'No database found.'}

            uid = request.session.authenticate(database, login, password)
            if not uid:
                return {'error': 'Invalid credentials'}
            
            user = request.env['res.users'].browse(uid)
            
            if user.mfa_enabled:
                # In a real scenario, we wouldn't fully login yet, or we'd mark session as 'partial'.
                # For this simple demo, we'll return a flag and expect the frontend to block access 
                # until MFA verify is called.
                # To be secure, 'mfa_verified' should be stored in session.
                request.session['mfa_verified'] = False
                return {
                    'status': 'mfa_required',
                    'uid': uid,
                    'name': user.name,
                }
            else:
                request.session['mfa_verified'] = True
                return {
                    'status': 'success',
                    'sid': request.session.sid,
                    'uid': uid,
                    'name': user.name,
                }
        except Exception as e:
            return {'error': str(e)}

    @http.route('/api/auth/mfa_verify', type='json', auth='user', csrf=False, cors='*')
    def mfa_verify(self, code):
        """
        Verifies the MFA code.
        For this demo, we check if code matches the stored secret exactly.
        """
        user = request.env.user
        if not user.mfa_enabled:
            return {'status': 'success', 'message': 'MFA not enabled'}
        
        # SIMPLE CHECK: code == secret 
        # In production: verify TOTP(secret, code)
        if hasattr(user, 'mfa_secret') and user.mfa_secret == code:
            request.session['mfa_verified'] = True
            return {'status': 'success'}
        
        return {'error': 'Invalid MFA Code'}

    # ==========================
    # CHAT
    # ==========================

    @http.route('/api/chat/join', type='json', auth='user', csrf=False, cors='*')
    def chat_join(self, channel_name="General"):
        """
        Join a discussion channel. If it doesn't exist, create it.
        """
        if not request.session.get('mfa_verified'):
            return {'error': 'MFA not verified'}

        Channel = request.env['mail.channel']
        channel = Channel.search([('name', '=', channel_name)], limit=1)
        if not channel:
            channel = Channel.create({
                'name': channel_name,
                'channel_type': 'channel',
                'public': 'public',
            })
        
        # Ensure user is a member
        channel.action_follow()
        
        return {
            'channel_id': channel.id,
            'name': channel.name,
        }

    @http.route('/api/chat/messages', type='json', auth='user', csrf=False, cors='*')
    def chat_messages(self, channel_id, limit=50):
        """
        Get last messages from a channel.
        """
        if not request.session.get('mfa_verified'):
            return {'error': 'MFA not verified'}

        domain = [('model', '=', 'mail.channel'), ('res_id', '=', int(channel_id)), ('message_type', '=', 'comment')]
        messages = request.env['mail.message'].search(domain, limit=limit, order='date desc')
        
        return {
            'messages': [{
                'id': m.id,
                'author': m.author_id.name,
                'body': m.body, # Note: body is HTML
                'date': m.date,
            } for m in messages]
        }

    @http.route('/api/chat/post', type='json', auth='user', csrf=False, cors='*')
    def chat_post(self, channel_id, body):
        """
        Post a message to the channel.
        """
        if not request.session.get('mfa_verified'):
            return {'error': 'MFA not verified'}

        channel = request.env['mail.channel'].browse(int(channel_id))
        if not channel.exists():
            return {'error': 'Channel not found'}
        
        msg = channel.message_post(body=body, message_type='comment', subtype_xmlid='mail.mt_comment')
        
        return {
            'status': 'success',
            'message_id': msg.id,
        }
