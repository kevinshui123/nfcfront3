import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from app import auth

def main():
    hashed = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f'  # from DB
    print('verify password123 ->', auth.verify_password('password123', hashed))

if __name__ == '__main__':
    main()


