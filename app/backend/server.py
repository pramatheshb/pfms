"from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'kraftinn-finance-secret-key-2024')
JWT_ALGORITHM = \"HS256\"
JWT_EXPIRATION_HOURS = 24

app = FastAPI(title=\"Kraftinn Finance ERP\")
api_router = APIRouter(prefix=\"/api\")
security = HTTPBearer()

# ============== ENUMS ==============
class UserRole(str, Enum):
    ADMIN = \"admin\"
    ACCOUNTANT = \"accountant\"
    MANAGER = \"manager\"
    VIEWER = \"viewer\"

class AccountType(str, Enum):
    ASSET = \"asset\"
    LIABILITY = \"liability\"
    EQUITY = \"equity\"
    REVENUE = \"revenue\"
    EXPENSE = \"expense\"

class TransactionType(str, Enum):
    INCOME = \"income\"
    EXPENSE = \"expense\"

class EntryType(str, Enum):
    DEBIT = \"debit\"
    CREDIT = \"credit\"

class PaymentStatus(str, Enum):
    PENDING = \"pending\"
    PARTIAL = \"partial\"
    PAID = \"paid\"
    OVERDUE = \"overdue\"

# ============== MODELS ==============
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.VIEWER

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = \"bearer\"
    user: UserResponse

# Company Settings
class CompanySettings(BaseModel):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str = \"Kraftinn\"
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    address: Optional[str] = None
    fiscal_year_start: str = \"04\"  # April
    fiscal_year_end: str = \"03\"  # March
    currency: str = \"INR\"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    address: Optional[str] = None
    fiscal_year_start: Optional[str] = None
    fiscal_year_end: Optional[str] = None

# Chart of Accounts
class AccountBase(BaseModel):
    account_code: str
    account_name: str
    account_type: AccountType
    parent_account_id: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True

class AccountCreate(AccountBase):
    pass

class Account(AccountBase):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    opening_balance: float = 0.0
    current_balance: float = 0.0

# Income/Expense Transactions
class TransactionBase(BaseModel):
    transaction_type: TransactionType
    account_id: str
    amount: float
    date: str  # ISO date string
    description: Optional[str] = None
    reference_number: Optional[str] = None
    category: Optional[str] = None
    gst_applicable: bool = False
    gst_rate: float = 0.0
    gst_amount: float = 0.0

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = \"\"
    net_amount: float = 0.0

# Journal Entry
class JournalLineItem(BaseModel):
    account_id: str
    account_name: Optional[str] = None
    entry_type: EntryType
    amount: float
    narration: Optional[str] = None

class JournalEntryBase(BaseModel):
    date: str
    narration: str
    reference_number: Optional[str] = None
    line_items: List[JournalLineItem]

class JournalEntryCreate(JournalEntryBase):
    pass

class JournalEntry(JournalEntryBase):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entry_number: str = \"\"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = \"\"
    total_debit: float = 0.0
    total_credit: float = 0.0
    is_posted: bool = False

# Accounts Payable/Receivable
class PartyBase(BaseModel):
    name: str
    party_type: Literal[\"customer\", \"vendor\"]
    email: Optional[str] = None
    phone: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None

class PartyCreate(PartyBase):
    pass

class Party(PartyBase):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total_receivable: float = 0.0
    total_payable: float = 0.0

class InvoiceBase(BaseModel):
    party_id: str
    invoice_type: Literal[\"sales\", \"purchase\"]
    invoice_number: str
    date: str
    due_date: str
    items: List[dict]
    subtotal: float
    gst_amount: float = 0.0
    total_amount: float
    notes: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    pass

class Invoice(InvoiceBase):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: PaymentStatus = PaymentStatus.PENDING
    paid_amount: float = 0.0
    balance_due: float = 0.0

# Bank Reconciliation
class BankAccountBase(BaseModel):
    account_name: str
    bank_name: str
    account_number: str
    ifsc_code: Optional[str] = None
    opening_balance: float = 0.0

class BankAccountCreate(BankAccountBase):
    pass

class BankAccount(BankAccountBase):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    current_balance: float = 0.0
    linked_account_id: Optional[str] = None

class BankTransactionBase(BaseModel):
    bank_account_id: str
    date: str
    description: str
    transaction_type: Literal[\"deposit\", \"withdrawal\"]
    amount: float
    reference: Optional[str] = None

class BankTransactionCreate(BankTransactionBase):
    pass

class BankTransaction(BankTransactionBase):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_reconciled: bool = False
    reconciled_with: Optional[str] = None

# GST Settings
class GSTSettings(BaseModel):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gst_enabled: bool = True
    cgst_rate: float = 9.0
    sgst_rate: float = 9.0
    igst_rate: float = 18.0
    cess_rate: float = 0.0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== AUTH HELPERS ==============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        \"sub\": user_id,
        \"email\": email,
        \"role\": role,
        \"exp\": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({\"id\": payload[\"sub\"]}, {\"_id\": 0})
        if not user:
            raise HTTPException(status_code=401, detail=\"User not found\")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail=\"Token expired\")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail=\"Invalid token\")

def require_roles(allowed_roles: List[UserRole]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user[\"role\"] not in [r.value for r in allowed_roles]:
            raise HTTPException(status_code=403, detail=\"Insufficient permissions\")
        return current_user
    return role_checker

# ============== AUTH ENDPOINTS ==============
@api_router.post(\"/auth/register\", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({\"email\": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail=\"Email already registered\")
    
    user = User(**user_data.model_dump(exclude={\"password\"}))
    user_dict = user.model_dump()
    user_dict[\"password_hash\"] = hash_password(user_data.password)
    user_dict[\"created_at\"] = user_dict[\"created_at\"].isoformat()
    
    await db.users.insert_one(user_dict)
    token = create_token(user.id, user.email, user.role.value)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active
        )
    )

@api_router.post(\"/auth/login\", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({\"email\": credentials.email}, {\"_id\": 0})
    if not user or not verify_password(credentials.password, user.get(\"password_hash\", \"\")):
        raise HTTPException(status_code=401, detail=\"Invalid credentials\")
    
    if not user.get(\"is_active\", True):
        raise HTTPException(status_code=403, detail=\"Account disabled\")
    
    token = create_token(user[\"id\"], user[\"email\"], user[\"role\"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user[\"id\"],
            email=user[\"email\"],
            full_name=user[\"full_name\"],
            role=user[\"role\"],
            is_active=user.get(\"is_active\", True)
        )
    )

@api_router.get(\"/auth/me\", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ============== USER MANAGEMENT ==============
@api_router.get(\"/users\", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_roles([UserRole.ADMIN]))):
    users = await db.users.find({}, {\"_id\": 0, \"password_hash\": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put(\"/users/{user_id}/role\")
async def update_user_role(user_id: str, role: UserRole, current_user: dict = Depends(require_roles([UserRole.ADMIN]))):
    result = await db.users.update_one({\"id\": user_id}, {\"$set\": {\"role\": role.value}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail=\"User not found\")
    return {\"message\": \"Role updated\"}

@api_router.put(\"/users/{user_id}/status\")
async def toggle_user_status(user_id: str, is_active: bool, current_user: dict = Depends(require_roles([UserRole.ADMIN]))):
    result = await db.users.update_one({\"id\": user_id}, {\"$set\": {\"is_active\": is_active}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail=\"User not found\")
    return {\"message\": \"Status updated\"}

# ============== COMPANY SETTINGS ==============
@api_router.get(\"/settings/company\", response_model=CompanySettings)
async def get_company_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.company_settings.find_one({}, {\"_id\": 0})
    if not settings:
        default = CompanySettings()
        settings_dict = default.model_dump()
        settings_dict[\"updated_at\"] = settings_dict[\"updated_at\"].isoformat()
        await db.company_settings.insert_one(settings_dict)
        return default
    if isinstance(settings.get(\"updated_at\"), str):
        settings[\"updated_at\"] = datetime.fromisoformat(settings[\"updated_at\"])
    return CompanySettings(**settings)

@api_router.put(\"/settings/company\", response_model=CompanySettings)
async def update_company_settings(data: CompanySettingsUpdate, current_user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.MANAGER]))):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data[\"updated_at\"] = datetime.now(timezone.utc).isoformat()
    
    await db.company_settings.update_one({}, {\"$set\": update_data}, upsert=True)
    return await get_company_settings(current_user)

# ============== GST SETTINGS ==============
@api_router.get(\"/settings/gst\", response_model=GSTSettings)
async def get_gst_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.gst_settings.find_one({}, {\"_id\": 0})
    if not settings:
        default = GSTSettings()
        settings_dict = default.model_dump()
        settings_dict[\"updated_at\"] = settings_dict[\"updated_at\"].isoformat()
        await db.gst_settings.insert_one(settings_dict)
        return default
    if isinstance(settings.get(\"updated_at\"), str):
        settings[\"updated_at\"] = datetime.fromisoformat(settings[\"updated_at\"])
    return GSTSettings(**settings)

@api_router.put(\"/settings/gst\", response_model=GSTSettings)
async def update_gst_settings(cgst_rate: float, sgst_rate: float, igst_rate: float, cess_rate: float = 0.0, current_user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT]))):
    update_data = {
        \"cgst_rate\": cgst_rate,
        \"sgst_rate\": sgst_rate,
        \"igst_rate\": igst_rate,
        \"cess_rate\": cess_rate,
        \"updated_at\": datetime.now(timezone.utc).isoformat()
    }
    await db.gst_settings.update_one({}, {\"$set\": update_data}, upsert=True)
    return await get_gst_settings(current_user)

# ============== CHART OF ACCOUNTS ==============
@api_router.post(\"/accounts\", response_model=Account)
async def create_account(data: AccountCreate, current_user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT]))):
    existing = await db.accounts.find_one({\"account_code\": data.account_code})
    if existing:
        raise HTTPException(status_code=400, detail=\"Account code already exists\")
    
    account = Account(**data.model_dump())
    account_dict = account.model_dump()
    account_dict[\"created_at\"] = account_dict[\"created_at\"].isoformat()
    await db.accounts.insert_one(account_dict)
    return account

@api_router.get(\"/accounts\", response_model=List[Account])
async def get_accounts(account_type: Optional[AccountType] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if account_type:
        query[\"account_type\"] = account_type.value
    accounts = await db.accounts.find(query, {\"_id\": 0}).to_list(1000)
    for acc in accounts:
        if isinstance(acc.get(\"created_at\"), str):
            acc[\"created_at\"] = datetime.fromisoformat(acc[\"created_at\"])
    return [Account(**a) for a in accounts]

@api_router.get(\"/accounts/{account_id}\", response_model=Account)
async def get_account(account_id: str, current_user: dict = Depends(get_current_user)):
    account = await db.accounts.find_one({\"id\": account_id}, {\"_id\": 0})
    if not account:
        raise HTTPException(status_code=404, detail=\"Account not found\")
    if isinstance(account.get(\"created_at\"), str):
        account[\"created_at\"] = datetime.fromisoformat(account[\"created_at\"])
    return Account(**account)

@api_router.put(\"/accounts/{account_id}\", response_model=Account)
async def update_account(account_id: str, data: AccountCreate, current_user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT]))):
    result = await db.accounts.update_one({\"id\": account_id}, {\"$set\": data.model_dump()})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail=\"Account not found\")
    return await get_account(account_id, current_user)

@api_router.delete(\"/accounts/{account_id}\")
async def delete_account(account_id: str, current_user: dict = Depends(require_roles([UserRole.ADMIN]))):
    result = await db.accounts.delete_one({\"id\": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=\"Account not found\")
    return {\"message\": \"Account deleted\"}

# ============== TRANSACTIONS (INCOME/EXPENSE) ==============
@api_router.post(\"/transactions\", response_model=Transaction)
async def create_transaction(data: TransactionCreate, current_user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.MANAGER]))):
    transaction = Transaction(**data.model_dump())
    transaction.created_by = current_user[\"id\"]
    transaction.net_amount = data.amount + data.gst_amount
    
    trans_dict = transaction.model_dump()
    trans_dict[\"created_at\"] = trans_dict[\"created_at\"].isoformat()
    await db.transactions.insert_one(trans_dict)
    
    # Update account balance
    multiplier = 1 if data.transaction_type == TransactionType.INCOME else -1
    await db.accounts.update_one(
        {\"id\": data.account_id},
        {\"$inc\": {\"current_balance\": transaction.net_amount * multiplier}}
    )
    
    return transaction

@api_router.get(\"/transactions\", response_model=List[Transaction])
async def get_transactions(
    transaction_type: Optional[TransactionType] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if transaction_type:
        query[\"transaction_type\"] = transaction_type.value
    if start_date:
        query[\"date\"] = {\"$gte\": start_date}
    if end_date:
        query.setdefault(\"date\", {})[\"$lte\"] = end_date
    
    transactions = await db.transactions.find(query, {\"_id\": 0}).sort(\"date\", -1).to_list(1000)
    for t in transactions:
        if isinstance(t.get(\"created_at\"), str):
            t[\"created_at\"] = datetime.fromisoformat(t[\"created_at\"])
    return [Transaction(**t) for t in transactions]

@api_router.get(\"/transactions/{transaction_id}\", response_model=Transaction)
async def get_transaction(transaction_id: str, current_user: dict = Depends(get_current_user)):
    transaction = await db.transactions.find_one({\"id\": transaction_id}, {\"_id\": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail=\"Transaction not found\")
    if isinstance(transaction.get(\"created_at\"), str):
        transaction[\"created_at\"] = datetime.fromisoformat(transaction[\"created_at\"])
    return Transaction(**transaction)

@api_router.put(\"/transactions/{transaction_id}\", response_model=Transaction)
async def update_transaction(transaction_id: str, data: TransactionCreate, current_user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT]))):
    old_trans = await db.transactions.find_one({\"id\": transaction_id}, {\"_id\": 0})
    if not old_trans:
        raise HTTPException(status_code=404, detail=\"Transaction not found\")
    
    # Reverse old balance
    old_multiplier = 1 if old_trans[\"transaction_type\"] == \"income\" else -1
    await db.accounts.update_one(
        {\"id\": old_trans[\"account_id\"]},
        {\"$inc\": {\"current_balance\": -old_trans[\"net_amount\"] * old_multiplier}}
    )
    
    # Apply new balance
    new_net = data.amount + data.gst_amount
    new_multiplier = 1 if data.transaction_type == TransactionType.INCOME else -1
    await db.accounts.update_one(
        {\"id\": data.account_id},
        {\"$inc\": {\"current_balance\": new_net * new_multiplier}}
    )
    
    update_data = data.model_dump()
    update_data[\"net_amount\"] = new_net
    await db.transactions.update_one({\"id\": transaction_id}, {\"$set\": update_data})
    
    return await get_transaction(transaction_id, current_user)

@api_router.delete(\"/transactions/{transaction_id}\")
async def delete_transaction(transaction_id: str, current_user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT]))):
    trans = await db.transactions.find_one({\"id\": transaction_id}, {\"_id\": 0})
    if not trans:
        raise HTTPException(status_code=404, detail=\"Transaction not found\")
    
    # Reverse balance
    multiplier = 1 if trans[\"transaction_type\"] == \"income\" else -1
    await db.accounts.update_one(
        {\"id\": trans[\"account_id\"]},
        {\"$inc\": {\"current_balance\": -trans[\"net_amount\"] * multiplier}}
    )
    
    await db.transactions.delete_one({\"id\": transaction_id})
    return {\"message\": \"Transaction deleted\"}

# ============== JOURNAL ENTRIES ==============
async def generate_entry_number():
    count = await db.journal_entries.count_documents({})
    return f\"JE-{count + 1:06d}\"

@api_router.post(\"/journal-entries\", response_model=JournalEntry)
async def create_journal_entry(data: JournalEntryCreate, current_user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT]))):
    total_debit = sum(item.amount for item in data.line_items if item.entry_type == EntryType.DEBIT)
    total_credit = sum(item.amount for item in data.line_items if item.entry_type == EntryType.CREDIT)
    
    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(status_code=400, detail=f\"Debits ({total_debit}) must equal credits ({total_credit})\")
    
    entry = JournalEntry(**data.model_dump())
    entry.entry_number = await generate_entry_number()
    entry.created_by = current_user[\"id\"]
    entry.total_debit = total_debit
    entry.total_credit = total_credit
    
    entry_dict = entry.model_dump()
    entry_dict[\"created_at\"] = entry_dict[\"created_at\"].isoformat()
    await db.journal_entries.insert_one(entry_dict)
    
    return entry

@api_router.get(\"/journal-entries\", response_model=List[JournalEntry])
async def get_journal_entries(start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if start_date:
        query[\"date\"] = {\"$gte\": start_date}
    if end_date:
        query.setdefault(\"date\", {})[\"$lte\"] = end_date
    
    entries = await db.journal_entries.find(query, {\"_id\": 0}).sort(\"date\", -1).to_list(1000)
    for e in entries:
        if isinstance(e.get(\"created_at\"), str):
            e[\"created_at\"] = datetime.fromisoformat(e[\"created_at\"])
    return [JournalEntry(**e) for e in entries]

@api_router.post(\"/journal-entries/{entry_id}/post\")
async def post_journal_entry(entry_id: str, current_user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT]))):
    entry = await db.journal_entries.find_one({\"id\": entry_id}, {\"_id\": 0})
    if not entry:
        raise HTTPException(status_code=404, detail=\"Journal entry not found\")
    
    if entry.get(\"is_posted\"):
        raise HTTPException(status_code=400, detail=\"Entry already posted\")
    
    # Update account balances
    for item in entry[\"line_items\"]:
        multiplier = 1 if item[\"entry_type\"] == \"debit\" else -1
        account = await db.accounts.find_one({\"id\": item[\"account_id\"]}, {\"_id\": 0})
        if account:
            if account[\"account_type\"] in [\"asset\", \"expense\"]:
                await db.accounts.update_one({\"id\": item[\"account_id\"]}, {\"$inc\": {\"current_balance\": item[\"amount\"] * multiplier}})
            else:
                await db.accounts.update_one({\"id\": item[\"account_id\"]}, {\"$inc\": {\"current_balance\": item[\"amount\"] * -multiplier}})
    
    await db.journal_entries.update_one({\"id\": entry_id}, {\"$set\": {\"is_posted\": True}})
    return {\"message\": \"Journal entry posted\"}

# ============== PARTIES (CUSTOMERS/VENDORS) ==============
@api_router.post(\"/parties\", response_model=Party)
async def create_party(data: PartyCreate, current_user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.MANAGER]))):
    party = Party(**data.model_dump())
    party_dict = party.model_dump()
    party_dict[\"created_at\"] = party_dict[\"created_at\"].isoformat()
    await db.parties.insert_one(party_dict)
    return party

@api_router.get(\"/parties\", response_model=List[Party])
async def get_parties(party_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if party_type:
        query[\"party_type\"] = party_type
    parties = await db.parties.find(query, {\"_id\": 0}).to_list(1000)
    for p in parties:
        if isinstance(p.get(\"created_at\"), str):
            p[\"created_at\"] = datetime.fromisoformat(p[\"created_at\"])
    return [Party(**p) for p in parties]

@api_router.get(\"/parties/{party_id}\", response_model=Party)
async def get_party(party_id: str, current_user: dict = Depends(get_current_user)):
    party = await db.parties.find_one({\"id\": party_id}, {\"_id\": 0})
    if not party:
        raise HTTPException(status_code=404, detail=\"Party not found\")
    if isinstance(party.get(\"created_at\"), str):
        party[\"created_at\"] = datetime.fromisoformat(party[\"created_at\"])
    return Party(**party)

# ============== INVOICES (AP/AR) ==============
@api_router.post(\"/invoices\", response_model=Invoice)
async def create_invoice(data: InvoiceCreate, current_user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.MANAGER]))):
    invoice = Invoice(**data.model_dump())
    invoice.balance_due = data.total_amount
    
    invoice_dict = invoice.model_dump()
    invoice_dict[\"created_at\"] = invoice_dict[\"created_at\"].isoformat()
    await db.invoices.insert_one(invoice_dict)
    
    # Update party balance
    if data.invoice_type == \"sales\":
        await db.parties.update_one({\"id\": data.party_id}, {\"$inc\": {\"total_receivable\": data.total_amount}})
    else:
        await db.parties.update_one({\"id\": data.party_id}, {\"$inc\": {\"total_payable\": data.total_amount}})
    
    return invoice

@api_router.get(\"/invoices\", response_model=List[Invoice])
async def get_invoices(invoice_type: Optional[str] = None, status: Optional[PaymentStatus] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if invoice_type:
        query[\"invoice_type\"] = invoice_type
    if status:
        query[\"status\"] = status.value
    
    invoices = await db.invoices.find(query, {\"_id\": 0}).sort(\"date\", -1).to_list(1000)
    for inv in invoices:
        if isinstance(inv.get(\"created_at\"), str):
            inv[\"created_at\"] = datetime.fromisoformat(inv[\"created_at\"])
    return [Invoice(**inv) for inv in invoices]

@api_router.post(\"/invoices/{invoice_id}/payment\")
async def record_payment(invoice_id: str, amount: float, current_user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT]))):
    invoice = await db.invoices.find_one({\"id\": invoice_id}, {\"_id\": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail=\"Invoice not found\")
    
    new_paid = invoice[\"paid_amount\"] + amount
    new_balance = invoice[\"total_amount\"] - new_paid
    new_status = PaymentStatus.PAID if new_balance <= 0 else (PaymentStatus.PARTIAL if new_paid > 0 else PaymentStatus.PENDING)
    
    await db.invoices.update_one(
        {\"id\": invoice_id},
        {\"$set\": {\"paid_amount\": new_paid, \"balance_due\": max(0, new_balance), \"status\": new_status.value}}
    )
    
    # Update party balance
    if invoice[\"invoice_type\"] == \"sales\":
        await db.parties.update_one({\"id\": invoice[\"party_id\"]}, {\"$inc\": {\"total_receivable\": -amount}})
    else:
        await db.parties.update_one({\"id\": invoice[\"party_id\"]}, {\"$inc\": {\"total_payable\": -amount}})
    
    return {\"message\": \"Payment recorded\", \"new_balance\": max(0, new_balance)}

# ============== BANK ACCOUNTS & RECONCILIATION ==============
@api_router.post(\"/bank-accounts\", response_model=BankAccount)
async def create_bank_account(data: BankAccountCreate, current_user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT]))):
    bank = BankAccount(**data.model_dump())
    bank.current_balance = data.opening_balance
    
    bank_dict = bank.model_dump()
    bank_dict[\"created_at\"] = bank_dict[\"created_at\"].isoformat()
    await db.bank_accounts.insert_one(bank_dict)
    return bank

@api_router.get(\"/bank-accounts\", response_model=List[BankAccount])
async def get_bank_accounts(current_user: dict = Depends(get_current_user)):
    banks = await db.bank_accounts.find({}, {\"_id\": 0}).to_list(100)
    for b in banks:
        if isinstance(b.get(\"created_at\"), str):
            b[\"created_at\"] = datetime.fromisoformat(b[\"created_at\"])
    return [BankAccount(**b) for b in banks]

@api_router.post(\"/bank-transactions\", response_model=BankTransaction)
async def create_bank_transaction(data: BankTransactionCreate, current_user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT]))):
    trans = BankTransaction(**data.model_dump())
    trans_dict = trans.model_dump()
    trans_dict[\"created_at\"] = trans_dict[\"created_at\"].isoformat()
    await db.bank_transactions.insert_one(trans_dict)
    
    # Update bank balance
    multiplier = 1 if data.transaction_type == \"deposit\" else -1
    await db.bank_accounts.update_one({\"id\": data.bank_account_id}, {\"$inc\": {\"current_balance\": data.amount * multiplier}})
    
    return trans

@api_router.get(\"/bank-transactions\", response_model=List[BankTransaction])
async def get_bank_transactions(bank_account_id: Optional[str] = None, is_reconciled: Optional[bool] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if bank_account_id:
        query[\"bank_account_id\"] = bank_account_id
    if is_reconciled is not None:
        query[\"is_reconciled\"] = is_reconciled
    
    trans = await db.bank_transactions.find(query, {\"_id\": 0}).sort(\"date\", -1).to_list(1000)
    for t in trans:
        if isinstance(t.get(\"created_at\"), str):
            t[\"created_at\"] = datetime.fromisoformat(t[\"created_at\"])
    return [BankTransaction(**t) for t in trans]

@api_router.post(\"/bank-transactions/{transaction_id}/reconcile\")
async def reconcile_transaction(transaction_id: str, current_user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT]))):
    result = await db.bank_transactions.update_one({\"id\": transaction_id}, {\"$set\": {\"is_reconciled\": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail=\"Transaction not found\")
    return {\"message\": \"Transaction reconciled\"}

# ============== REPORTS ==============
@api_router.get(\"/reports/dashboard\")
async def get_dashboard_data(current_user: dict = Depends(get_current_user)):
    # Total Income
    income_pipeline = [
        {\"$match\": {\"transaction_type\": \"income\"}},
        {\"$group\": {\"_id\": None, \"total\": {\"$sum\": \"$net_amount\"}}}
    ]
    income_result = await db.transactions.aggregate(income_pipeline).to_list(1)
    total_income = income_result[0][\"total\"] if income_result else 0
    
    # Total Expenses
    expense_pipeline = [
        {\"$match\": {\"transaction_type\": \"expense\"}},
        {\"$group\": {\"_id\": None, \"total\": {\"$sum\": \"$net_amount\"}}}
    ]
    expense_result = await db.transactions.aggregate(expense_pipeline).to_list(1)
    total_expenses = expense_result[0][\"total\"] if expense_result else 0
    
    # Receivables
    receivable_pipeline = [
        {\"$match\": {\"invoice_type\": \"sales\", \"status\": {\"$ne\": \"paid\"}}},
        {\"$group\": {\"_id\": None, \"total\": {\"$sum\": \"$balance_due\"}}}
    ]
    receivable_result = await db.invoices.aggregate(receivable_pipeline).to_list(1)
    total_receivables = receivable_result[0][\"total\"] if receivable_result else 0
    
    # Payables
    payable_pipeline = [
        {\"$match\": {\"invoice_type\": \"purchase\", \"status\": {\"$ne\": \"paid\"}}},
        {\"$group\": {\"_id\": None, \"total\": {\"$sum\": \"$balance_due\"}}}
    ]
    payable_result = await db.invoices.aggregate(payable_pipeline).to_list(1)
    total_payables = payable_result[0][\"total\"] if payable_result else 0
    
    # Recent Transactions
    recent_trans = await db.transactions.find({}, {\"_id\": 0}).sort(\"created_at\", -1).limit(5).to_list(5)
    
    # Monthly trend (last 6 months)
    monthly_data = []
    for i in range(5, -1, -1):
        date = datetime.now(timezone.utc) - timedelta(days=i*30)
        month_start = date.replace(day=1).strftime(\"%Y-%m-%d\")
        month_end = (date.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        month_end_str = month_end.strftime(\"%Y-%m-%d\")
        
        inc = await db.transactions.aggregate([
            {\"$match\": {\"transaction_type\": \"income\", \"date\": {\"$gte\": month_start, \"$lte\": month_end_str}}},
            {\"$group\": {\"_id\": None, \"total\": {\"$sum\": \"$net_amount\"}}}
        ]).to_list(1)
        
        exp = await db.transactions.aggregate([
            {\"$match\": {\"transaction_type\": \"expense\", \"date\": {\"$gte\": month_start, \"$lte\": month_end_str}}},
            {\"$group\": {\"_id\": None, \"total\": {\"$sum\": \"$net_amount\"}}}
        ]).to_list(1)
        
        monthly_data.append({
            \"month\": date.strftime(\"%b\"),
            \"income\": inc[0][\"total\"] if inc else 0,
            \"expense\": exp[0][\"total\"] if exp else 0
        })
    
    return {
        \"total_income\": total_income,
        \"total_expenses\": total_expenses,
        \"net_profit\": total_income - total_expenses,
        \"total_receivables\": total_receivables,
        \"total_payables\": total_payables,
        \"recent_transactions\": recent_trans,
        \"monthly_trend\": monthly_data
    }

@api_router.get(\"/reports/trial-balance\")
async def get_trial_balance(as_of_date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    accounts = await db.accounts.find({}, {\"_id\": 0}).to_list(1000)
    
    trial_balance = []
    total_debit = 0
    total_credit = 0
    
    for acc in accounts:
        balance = acc.get(\"current_balance\", 0)
        if acc[\"account_type\"] in [\"asset\", \"expense\"]:
            if balance >= 0:
                trial_balance.append({\"account_code\": acc[\"account_code\"], \"account_name\": acc[\"account_name\"], \"debit\": balance, \"credit\": 0})
                total_debit += balance
            else:
                trial_balance.append({\"account_code\": acc[\"account_code\"], \"account_name\": acc[\"account_name\"], \"debit\": 0, \"credit\": abs(balance)})
                total_credit += abs(balance)
        else:
            if balance >= 0:
                trial_balance.append({\"account_code\": acc[\"account_code\"], \"account_name\": acc[\"account_name\"], \"debit\": 0, \"credit\": balance})
                total_credit += balance
            else:
                trial_balance.append({\"account_code\": acc[\"account_code\"], \"account_name\": acc[\"account_name\"], \"debit\": abs(balance), \"credit\": 0})
                total_debit += abs(balance)
    
    return {
        \"as_of_date\": as_of_date or datetime.now(timezone.utc).strftime(\"%Y-%m-%d\"),
        \"accounts\": trial_balance,
        \"total_debit\": total_debit,
        \"total_credit\": total_credit,
        \"is_balanced\": abs(total_debit - total_credit) < 0.01
    }

@api_router.get(\"/reports/balance-sheet\")
async def get_balance_sheet(as_of_date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    accounts = await db.accounts.find({}, {\"_id\": 0}).to_list(1000)
    
    assets = [{\"name\": a[\"account_name\"], \"balance\": a.get(\"current_balance\", 0)} for a in accounts if a[\"account_type\"] == \"asset\"]
    liabilities = [{\"name\": a[\"account_name\"], \"balance\": a.get(\"current_balance\", 0)} for a in accounts if a[\"account_type\"] == \"liability\"]
    equity = [{\"name\": a[\"account_name\"], \"balance\": a.get(\"current_balance\", 0)} for a in accounts if a[\"account_type\"] == \"equity\"]
    
    total_assets = sum(a[\"balance\"] for a in assets)
    total_liabilities = sum(l[\"balance\"] for l in liabilities)
    total_equity = sum(e[\"balance\"] for e in equity)
    
    # Calculate retained earnings from P&L
    revenues = await db.accounts.find({\"account_type\": \"revenue\"}, {\"_id\": 0}).to_list(1000)
    expenses = await db.accounts.find({\"account_type\": \"expense\"}, {\"_id\": 0}).to_list(1000)
    net_income = sum(r.get(\"current_balance\", 0) for r in revenues) - sum(e.get(\"current_balance\", 0) for e in expenses)
    
    return {
        \"as_of_date\": as_of_date or datetime.now(timezone.utc).strftime(\"%Y-%m-%d\"),
        \"assets\": {\"items\": assets, \"total\": total_assets},
        \"liabilities\": {\"items\": liabilities, \"total\": total_liabilities},
        \"equity\": {\"items\": equity + [{\"name\": \"Retained Earnings\", \"balance\": net_income}], \"total\": total_equity + net_income},
        \"total_liabilities_and_equity\": total_liabilities + total_equity + net_income
    }

@api_router.get(\"/reports/profit-loss\")
async def get_profit_loss(start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    # Get income transactions
    income_query = {\"transaction_type\": \"income\"}
    if start_date:
        income_query[\"date\"] = {\"$gte\": start_date}
    if end_date:
        income_query.setdefault(\"date\", {})[\"$lte\"] = end_date
    
    income_trans = await db.transactions.find(income_query, {\"_id\": 0}).to_list(1000)
    
    # Get expense transactions
    expense_query = {\"transaction_type\": \"expense\"}
    if start_date:
        expense_query[\"date\"] = {\"$gte\": start_date}
    if end_date:
        expense_query.setdefault(\"date\", {})[\"$lte\"] = end_date
    
    expense_trans = await db.transactions.find(expense_query, {\"_id\": 0}).to_list(1000)
    
    # Group by category
    income_by_category = {}
    for t in income_trans:
        cat = t.get(\"category\", \"Other Income\")
        income_by_category[cat] = income_by_category.get(cat, 0) + t.get(\"net_amount\", 0)
    
    expense_by_category = {}
    for t in expense_trans:
        cat = t.get(\"category\", \"Other Expenses\")
        expense_by_category[cat] = expense_by_category.get(cat, 0) + t.get(\"net_amount\", 0)
    
    total_income = sum(income_by_category.values())
    total_expenses = sum(expense_by_category.values())
    
    return {
        \"period\": {\"start\": start_date or \"Beginning\", \"end\": end_date or datetime.now(timezone.utc).strftime(\"%Y-%m-%d\")},
        \"revenue\": {\"items\": [{\"name\": k, \"amount\": v} for k, v in income_by_category.items()], \"total\": total_income},
        \"expenses\": {\"items\": [{\"name\": k, \"amount\": v} for k, v in expense_by_category.items()], \"total\": total_expenses},
        \"gross_profit\": total_income - total_expenses,
        \"net_profit\": total_income - total_expenses
    }

@api_router.get(\"/reports/cash-flow\")
async def get_cash_flow(start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    # Operating activities
    income_query = {\"transaction_type\": \"income\"}
    expense_query = {\"transaction_type\": \"expense\"}
    
    if start_date:
        income_query[\"date\"] = {\"$gte\": start_date}
        expense_query[\"date\"] = {\"$gte\": start_date}
    if end_date:
        income_query.setdefault(\"date\", {})[\"$lte\"] = end_date
        expense_query.setdefault(\"date\", {})[\"$lte\"] = end_date
    
    income_result = await db.transactions.aggregate([
        {\"$match\": income_query},
        {\"$group\": {\"_id\": None, \"total\": {\"$sum\": \"$net_amount\"}}}
    ]).to_list(1)
    
    expense_result = await db.transactions.aggregate([
        {\"$match\": expense_query},
        {\"$group\": {\"_id\": None, \"total\": {\"$sum\": \"$net_amount\"}}}
    ]).to_list(1)
    
    total_income = income_result[0][\"total\"] if income_result else 0
    total_expenses = expense_result[0][\"total\"] if expense_result else 0
    
    operating_cash_flow = total_income - total_expenses
    
    # Bank balances
    banks = await db.bank_accounts.find({}, {\"_id\": 0}).to_list(100)
    total_bank_balance = sum(b.get(\"current_balance\", 0) for b in banks)
    
    return {
        \"period\": {\"start\": start_date or \"Beginning\", \"end\": end_date or datetime.now(timezone.utc).strftime(\"%Y-%m-%d\")},
        \"operating_activities\": {
            \"cash_from_customers\": total_income,
            \"cash_paid_to_suppliers\": total_expenses,
            \"net_cash_from_operations\": operating_cash_flow
        },
        \"investing_activities\": {\"net_cash\": 0},
        \"financing_activities\": {\"net_cash\": 0},
        \"net_change_in_cash\": operating_cash_flow,
        \"ending_cash_balance\": total_bank_balance
    }

@api_router.get(\"/reports/general-ledger\")
async def get_general_ledger(account_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    account = await db.accounts.find_one({\"id\": account_id}, {\"_id\": 0})
    if not account:
        raise HTTPException(status_code=404, detail=\"Account not found\")
    
    # Get transactions for this account
    query = {\"account_id\": account_id}
    if start_date:
        query[\"date\"] = {\"$gte\": start_date}
    if end_date:
        query.setdefault(\"date\", {})[\"$lte\"] = end_date
    
    transactions = await db.transactions.find(query, {\"_id\": 0}).sort(\"date\", 1).to_list(1000)
    
    # Get journal entries for this account
    je_query = {\"line_items.account_id\": account_id}
    journal_entries = await db.journal_entries.find(je_query, {\"_id\": 0}).sort(\"date\", 1).to_list(1000)
    
    ledger_entries = []
    running_balance = account.get(\"opening_balance\", 0)
    
    for t in transactions:
        if t[\"transaction_type\"] == \"income\":
            running_balance += t.get(\"net_amount\", 0)
            ledger_entries.append({
                \"date\": t[\"date\"],
                \"description\": t.get(\"description\", \"\"),
                \"reference\": t.get(\"reference_number\", \"\"),
                \"debit\": t.get(\"net_amount\", 0) if account[\"account_type\"] in [\"asset\", \"expense\"] else 0,
                \"credit\": t.get(\"net_amount\", 0) if account[\"account_type\"] in [\"liability\", \"equity\", \"revenue\"] else 0,
                \"balance\": running_balance
            })
        else:
            running_balance -= t.get(\"net_amount\", 0)
            ledger_entries.append({
                \"date\": t[\"date\"],
                \"description\": t.get(\"description\", \"\"),
                \"reference\": t.get(\"reference_number\", \"\"),
                \"debit\": t.get(\"net_amount\", 0) if account[\"account_type\"] in [\"liability\", \"equity\", \"revenue\"] else 0,
                \"credit\": t.get(\"net_amount\", 0) if account[\"account_type\"] in [\"asset\", \"expense\"] else 0,
                \"balance\": running_balance
            })
    
    return {
        \"account\": {\"id\": account[\"id\"], \"code\": account[\"account_code\"], \"name\": account[\"account_name\"], \"type\": account[\"account_type\"]},
        \"period\": {\"start\": start_date or \"Beginning\", \"end\": end_date or datetime.now(timezone.utc).strftime(\"%Y-%m-%d\")},
        \"opening_balance\": account.get(\"opening_balance\", 0),
        \"entries\": ledger_entries,
        \"closing_balance\": running_balance
    }

# ============== SEED DATA ==============
@api_router.post(\"/seed-accounts\")
async def seed_default_accounts(current_user: dict = Depends(require_roles([UserRole.ADMIN]))):
    default_accounts = [
        {\"account_code\": \"1000\", \"account_name\": \"Cash\", \"account_type\": \"asset\"},
        {\"account_code\": \"1100\", \"account_name\": \"Bank Account\", \"account_type\": \"asset\"},
        {\"account_code\": \"1200\", \"account_name\": \"Accounts Receivable\", \"account_type\": \"asset\"},
        {\"account_code\": \"1300\", \"account_name\": \"Inventory\", \"account_type\": \"asset\"},
        {\"account_code\": \"1400\", \"account_name\": \"Prepaid Expenses\", \"account_type\": \"asset\"},
        {\"account_code\": \"1500\", \"account_name\": \"Fixed Assets\", \"account_type\": \"asset\"},
        {\"account_code\": \"2000\", \"account_name\": \"Accounts Payable\", \"account_type\": \"liability\"},
        {\"account_code\": \"2100\", \"account_name\": \"Short Term Loans\", \"account_type\": \"liability\"},
        {\"account_code\": \"2200\", \"account_name\": \"GST Payable\", \"account_type\": \"liability\"},
        {\"account_code\": \"2300\", \"account_name\": \"TDS Payable\", \"account_type\": \"liability\"},
        {\"account_code\": \"3000\", \"account_name\": \"Share Capital\", \"account_type\": \"equity\"},
        {\"account_code\": \"3100\", \"account_name\": \"Retained Earnings\", \"account_type\": \"equity\"},
        {\"account_code\": \"4000\", \"account_name\": \"Sales Revenue\", \"account_type\": \"revenue\"},
        {\"account_code\": \"4100\", \"account_name\": \"Service Income\", \"account_type\": \"revenue\"},
        {\"account_code\": \"4200\", \"account_name\": \"Interest Income\", \"account_type\": \"revenue\"},
        {\"account_code\": \"5000\", \"account_name\": \"Cost of Goods Sold\", \"account_type\": \"expense\"},
        {\"account_code\": \"5100\", \"account_name\": \"Salaries & Wages\", \"account_type\": \"expense\"},
        {\"account_code\": \"5200\", \"account_name\": \"Rent Expense\", \"account_type\": \"expense\"},
        {\"account_code\": \"5300\", \"account_name\": \"Utilities\", \"account_type\": \"expense\"},
        {\"account_code\": \"5400\", \"account_name\": \"Office Supplies\", \"account_type\": \"expense\"},
        {\"account_code\": \"5500\", \"account_name\": \"Professional Fees\", \"account_type\": \"expense\"},
        {\"account_code\": \"5600\", \"account_name\": \"Depreciation\", \"account_type\": \"expense\"},
        {\"account_code\": \"5700\", \"account_name\": \"Bank Charges\", \"account_type\": \"expense\"},
    ]
    
    for acc_data in default_accounts:
        existing = await db.accounts.find_one({\"account_code\": acc_data[\"account_code\"]})
        if not existing:
            account = Account(**acc_data)
            acc_dict = account.model_dump()
            acc_dict[\"created_at\"] = acc_dict[\"created_at\"].isoformat()
            await db.accounts.insert_one(acc_dict)
    
    return {\"message\": \"Default accounts seeded successfully\"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=[\"*\"],
    allow_headers=[\"*\"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event(\"shutdown\")
async def shutdown_db_client():
    client.close()
"