from web3 import Web3
import json
import os
import datetime

class DAOController:
    def __init__(self):
        # In a real app, this would connect to Infura/Alchemy or a local node
        # For this demo, we use a simulation if no Simulation Provider is found
        self.w3 = Web3(Web3.HTTPProvider(os.getenv('WEB3_PROVIDER_URI', 'http://localhost:8545')))
        self.connected = self.w3.is_connected()
        
        # Mock Ledger for "Simulated" DAO if blockchain is not active
        self.simulated_ledger = [
            {"to": "Vamsi Krishna", "amount": 1000, "reason": "Initial Founder Allocation", "tx_hash": "0x123...abc", "date": "2024-01-01"},
            {"to": "Sai Prakash", "amount": 500, "reason": "Backend Architecture", "tx_hash": "0x456...def", "date": "2024-01-05"},
            {"to": "Dana Rao", "amount": 500, "reason": "Frontend Design", "tx_hash": "0x789...ghi", "date": "2024-01-10"}
        ]

    def award_points(self, admin_addr, user_name, amount, reason):
        """
        Awards Founder Points to a user.
        """
        tx_hash = f"0x{os.urandom(32).hex()}"
        
        # REAL BLOCKCHAIN LOGIC (Commented out for demo without private keys)
        # if self.connected:
        #     contract = self.w3.eth.contract(address=CONTRACT_ADDR, abi=ABI)
        #     tx = contract.functions.award(user_wallet, amount).build_transaction(...)
        #     signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=ADMIN_KEY)
        #     tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # RECORD IN LEDGER
        entry = {
            "to": user_name,
            "amount": int(amount),
            "reason": reason,
            "tx_hash": tx_hash,
            "date": datetime.datetime.now().strftime("%Y-%m-%d")
        }
        self.simulated_ledger.append(entry)
        
        return {"status": "success", "tx_hash": tx_hash, "block": len(self.simulated_ledger)}

    def get_cap_table(self):
        """
        Aggregates points per user to show the Cap Table.
        """
        cap_table = {}
        total_supply = 0
        
        for tx in self.simulated_ledger:
            user = tx['to']
            amount = tx['amount']
            if user not in cap_table:
                cap_table[user] = 0
            cap_table[user] += amount
            total_supply += amount
            
        # Format for frontend
        result = []
        for user, balance in cap_table.items():
            percentage = (balance / total_supply * 100) if total_supply > 0 else 0
            result.append({
                "name": user,
                "shares": balance,
                "percentage": round(percentage, 2)
            })
            
        return sorted(result, key=lambda x: x['shares'], reverse=True)

    def get_ledger(self):
        return self.simulated_ledger
