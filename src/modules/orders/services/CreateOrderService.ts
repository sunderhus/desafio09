import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Invalid customer.');
    }

    const productsId = products.map(product => ({ id: product.id }));

    const findProducts = await this.productsRepository.findAllById(productsId);

    if (findProducts.length !== productsId.length) {
      throw new AppError('Some products are unavailable');
    }

    if (findProducts.length <= 0) {
      throw new AppError('You need to select at least one product.');
    }
    const updatedQuantities: IUpdateProductsQuantityDTO[] = [];

    const updateProducts = findProducts.map(findProduct => {
      const product = products.find(item => item.id === findProduct.id);

      if (!product) {
        throw new AppError('This order has invalid Products.');
      }

      if (product.quantity > findProduct.quantity) {
        throw new AppError(
          `The product ${findProduct.name}, has only ${findProduct.quantity} avaliable, but you request ${product.quantity}.`,
        );
      }

      updatedQuantities.push({
        id: product.id,
        quantity: findProduct.quantity - product.quantity,
      });

      return {
        ...findProduct,
        quantity: product.quantity,
      };
    });

    await this.productsRepository.updateQuantity(updatedQuantities);

    const new_order = await this.ordersRepository.create({
      customer,
      products: updateProducts.map(updateProduct => ({
        product_id: updateProduct.id,
        price: updateProduct.price,
        quantity: updateProduct.quantity,
      })),
    });

    if (!new_order) {
      throw new AppError('Something wrong on create a new order.');
    }

    return new_order;
  }
}

export default CreateOrderService;
