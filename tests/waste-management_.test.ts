import { describe, it, expect, beforeEach } from 'vitest';

// Mock blockchain state
interface BlockchainState {
  balances: Map<string, number>;
  smartBins: Map<number, SmartBin>;
  products: Map<number, Product>;
}

interface SmartBin {
  wasteType: string;
  amount: number;
  accuracy: number;
}

interface Product {
  name: string;
  price: number;
  seller: string;
  material: string;
}

describe('Waste Management System Smart Contract', () => {
  let state: BlockchainState;
  const contractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const user1 = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const user2 = 'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  
  beforeEach(() => {
    state = {
      balances: new Map([[contractOwner, 1000000], [user1, 1000], [user2, 1000]]),
      smartBins: new Map(),
      products: new Map()
    };
  });
  
  // Helper functions to simulate contract functions
  const registerSmartBin = (sender: string, wasteType: string): number => {
    if (sender !== contractOwner) throw new Error('Unauthorized');
    const binId = state.smartBins.size + 1;
    state.smartBins.set(binId, { wasteType, amount: 0, accuracy: 100 });
    return binId;
  };
  
  const updateSmartBin = (sender: string, binId: number, amount: number, accuracy: number): boolean => {
    if (sender !== contractOwner) throw new Error('Unauthorized');
    const bin = state.smartBins.get(binId);
    if (!bin) throw new Error('Bin not found');
    state.smartBins.set(binId, { ...bin, amount, accuracy });
    return true;
  };
  
  const rewardRecycler = (sender: string, recycler: string, amount: number): boolean => {
    if (sender !== contractOwner) throw new Error('Unauthorized');
    const balance = state.balances.get(recycler) || 0;
    state.balances.set(recycler, balance + amount);
    return true;
  };
  
  const listProduct = (seller: string, name: string, price: number, material: string): number => {
    const productId = state.products.size + 1;
    state.products.set(productId, { name, price, seller, material });
    return productId;
  };
  
  const buyProduct = (buyer: string, productId: number): boolean => {
    const product = state.products.get(productId);
    if (!product) throw new Error('Product not found');
    const buyerBalance = state.balances.get(buyer) || 0;
    if (buyerBalance < product.price) throw new Error('Insufficient balance');
    state.balances.set(buyer, buyerBalance - product.price);
    const sellerBalance = state.balances.get(product.seller) || 0;
    state.balances.set(product.seller, sellerBalance + product.price);
    return true;
  };
  
  // Tests
  it('allows registering a smart bin', () => {
    const binId = registerSmartBin(contractOwner, 'Plastic');
    expect(binId).toBe(1);
    expect(state.smartBins.get(1)).toEqual({ wasteType: 'Plastic', amount: 0, accuracy: 100 });
  });
  
  it('allows updating a smart bin', () => {
    registerSmartBin(contractOwner, 'Plastic');
    const result = updateSmartBin(contractOwner, 1, 50, 95);
    expect(result).toBe(true);
    expect(state.smartBins.get(1)).toEqual({ wasteType: 'Plastic', amount: 50, accuracy: 95 });
  });
  
  it('allows rewarding a recycler', () => {
    const result = rewardRecycler(contractOwner, user1, 100);
    expect(result).toBe(true);
    expect(state.balances.get(user1)).toBe(1100);
  });
  
  it('allows listing a product', () => {
    const productId = listProduct(user1, 'Upcycled Bag', 50, 'Recycled Plastic');
    expect(productId).toBe(1);
    expect(state.products.get(1)).toEqual({
      name: 'Upcycled Bag',
      price: 50,
      seller: user1,
      material: 'Recycled Plastic'
    });
  });
  
  it('allows buying a product', () => {
    listProduct(user1, 'Upcycled Bag', 50, 'Recycled Plastic');
    const result = buyProduct(user2, 1);
    expect(result).toBe(true);
    expect(state.balances.get(user1)).toBe(1050);
    expect(state.balances.get(user2)).toBe(950);
  });
  
  it('prevents unauthorized smart bin registration', () => {
    expect(() => registerSmartBin(user1, 'Plastic')).toThrow('Unauthorized');
  });
  
  it('prevents buying a product with insufficient balance', () => {
    listProduct(user1, 'Expensive Item', 2000, 'Gold');
    expect(() => buyProduct(user2, 1)).toThrow('Insufficient balance');
  });
});

