export type RestaurantEnquiry = {
  id: string;
  name: string;
  email: string;
  requestedAt: Date;
  message: string;
};

export type AdminMenuItem = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  price: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminMenuCategory = {
  id: string;
  name: string;
  isActive: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};
