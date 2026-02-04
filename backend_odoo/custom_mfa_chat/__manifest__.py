{
    'name': 'Custom MFA & Chat',
    'version': '1.0',
    'summary': 'MFA Login and Group Chat Backend',
    'description': 'Module for MFA authentication and simple polling chat.',
    'category': 'Tools',
    'author': 'Antigravity',
    'depends': ['base', 'web', 'mail'],
    'data': [
        'views/res_users_views.xml',
        'data/user_data.xml',
    ],
    'installable': True,
    'application': True,
}
