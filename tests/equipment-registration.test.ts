import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity VM environment
const mockClarity = {
  contracts: {},
  blockHeight: 1,
  blockTime: 1617984000, // Example timestamp
  txSender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Example principal
  
  // Mock functions
  callReadOnlyFn: function(contract, fn, args, sender) {
    if (contract === 'equipment-registration' && fn === 'get-last-equipment-id') {
      return { type: 'uint', value: this.contracts['equipment-registration'].lastEquipmentId };
    }
    if (contract === 'equipment-registration' && fn === 'get-equipment') {
      const equipmentId = args[0].value;
      const equipment = this.contracts['equipment-registration'].equipmentRegistry[equipmentId];
      return equipment ? { type: 'some', value: equipment } : { type: 'none' };
    }
    return { type: 'err', value: 9999 }; // Default error
  },
  
  callPublicFn: function(contract, fn, args, sender) {
    if (contract === 'equipment-registration' && fn === 'register-equipment') {
      const name = args[0].value;
      const category = args[1].value;
      const manufacturer = args[2].value;
      const serialNumber = args[3].value;
      const manufactureDate = args[4].value;
      
      this.contracts['equipment-registration'].lastEquipmentId++;
      const newId = this.contracts['equipment-registration'].lastEquipmentId;
      
      this.contracts['equipment-registration'].equipmentRegistry[newId] = {
        name,
        category,
        manufacturer,
        'serial-number': serialNumber,
        'manufacture-date': manufactureDate,
        owner: sender,
        'registered-at': this.blockTime
      };
      
      return { type: 'ok', value: newId };
    }
    
    if (contract === 'equipment-registration' && fn === 'transfer-equipment') {
      const equipmentId = args[0].value;
      const newOwner = args[1].value;
      
      const equipment = this.contracts['equipment-registration'].equipmentRegistry[equipmentId];
      if (!equipment) {
        return { type: 'err', value: 2000 };
      }
      
      if (equipment.owner !== sender) {
        return { type: 'err', value: 2001 };
      }
      
      this.contracts['equipment-registration'].equipmentRegistry[equipmentId].owner = newOwner;
      return { type: 'ok', value: true };
    }
    
    return { type: 'err', value: 9999 }; // Default error
  }
};

// Initialize the mock contract state
function initMockContracts() {
  mockClarity.contracts['equipment-registration'] = {
    lastEquipmentId: 0,
    equipmentRegistry: {}
  };
}

describe('Equipment Registration Contract', () => {
  beforeEach(() => {
    initMockContracts();
  });
  
  it('should register new equipment and return the ID', () => {
    const result = mockClarity.callPublicFn(
        'equipment-registration',
        'register-equipment',
        [
          { type: 'string-utf8', value: 'Pro Tennis Racket' },
          { type: 'string-utf8', value: 'Tennis' },
          { type: 'string-utf8', value: 'Wilson' },
          { type: 'string-utf8', value: 'WL123456' },
          { type: 'uint', value: 1617900000 }
        ],
        mockClarity.txSender
    );
    
    expect(result.type).toBe('ok');
    expect(result.value).toBe(1);
    
    const lastIdResult = mockClarity.callReadOnlyFn(
        'equipment-registration',
        'get-last-equipment-id',
        [],
        mockClarity.txSender
    );
    
    expect(lastIdResult.value).toBe(1);
  });
  
  it('should retrieve registered equipment details', () => {
    // First register equipment
    mockClarity.callPublicFn(
        'equipment-registration',
        'register-equipment',
        [
          { type: 'string-utf8', value: 'Pro Tennis Racket' },
          { type: 'string-utf8', value: 'Tennis' },
          { type: 'string-utf8', value: 'Wilson' },
          { type: 'string-utf8', value: 'WL123456' },
          { type: 'uint', value: 1617900000 }
        ],
        mockClarity.txSender
    );
    
    // Then retrieve it
    const result = mockClarity.callReadOnlyFn(
        'equipment-registration',
        'get-equipment',
        [{ type: 'uint', value: 1 }],
        mockClarity.txSender
    );
    
    expect(result.type).toBe('some');
    expect(result.value.name).toBe('Pro Tennis Racket');
    expect(result.value.category).toBe('Tennis');
    expect(result.value.manufacturer).toBe('Wilson');
    expect(result.value['serial-number']).toBe('WL123456');
    expect(result.value.owner).toBe(mockClarity.txSender);
  });
  
  it('should transfer equipment ownership', () => {
    // First register equipment
    mockClarity.callPublicFn(
        'equipment-registration',
        'register-equipment',
        [
          { type: 'string-utf8', value: 'Pro Tennis Racket' },
          { type: 'string-utf8', value: 'Tennis' },
          { type: 'string-utf8', value: 'Wilson' },
          { type: 'string-utf8', value: 'WL123456' },
          { type: 'uint', value: 1617900000 }
        ],
        mockClarity.txSender
    );
    
    const newOwner = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    
    // Transfer ownership
    const transferResult = mockClarity.callPublicFn(
        'equipment-registration',
        'transfer-equipment',
        [
          { type: 'uint', value: 1 },
          { type: 'principal', value: newOwner }
        ],
        mockClarity.txSender
    );
    
    expect(transferResult.type).toBe('ok');
    expect(transferResult.value).toBe(true);
    
    // Verify new ownership
    const equipmentResult = mockClarity.callReadOnlyFn(
        'equipment-registration',
        'get-equipment',
        [{ type: 'uint', value: 1 }],
        mockClarity.txSender
    );
    
    expect(equipmentResult.value.owner).toBe(newOwner);
  });
  
  it('should fail to transfer equipment if not the owner', () => {
    // First register equipment
    mockClarity.callPublicFn(
        'equipment-registration',
        'register-equipment',
        [
          { type: 'string-utf8', value: 'Pro Tennis Racket' },
          { type: 'string-utf8', value: 'Tennis' },
          { type: 'string-utf8', value: 'Wilson' },
          { type: 'string-utf8', value: 'WL123456' },
          { type: 'uint', value: 1617900000 }
        ],
        mockClarity.txSender
    );
    
    const nonOwner = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const newOwner = 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0';
    
    // Attempt transfer by non-owner
    const transferResult = mockClarity.callPublicFn(
        'equipment-registration',
        'transfer-equipment',
        [
          { type: 'uint', value: 1 },
          { type: 'principal', value: newOwner }
        ],
        nonOwner
    );
    
    expect(transferResult.type).toBe('err');
    expect(transferResult.value).toBe(2001); // Error code for not being the owner
  });
});
