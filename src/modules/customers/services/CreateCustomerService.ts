import AppError from '@shared/errors/AppError';
import { inject, injectable } from 'tsyringe';

import Customer from '../infra/typeorm/entities/Customer';
import ICustomersRepository from '../repositories/ICustomersRepository';

interface IRequest {
  name: string;
  email: string;
}

@injectable()
class CreateCustomerService {
  constructor(
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ name, email }: IRequest): Promise<Customer> {
    const hasCustomer = await this.customersRepository.findByEmail(email);

    if (hasCustomer) {
      throw new AppError('This e-mail is already taken.');
    }
    const customer = await this.customersRepository.create({ name, email });
    return customer;
  }
}

export default CreateCustomerService;
