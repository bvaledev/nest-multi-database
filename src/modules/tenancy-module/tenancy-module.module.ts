import { Global, Module, Scope } from '@nestjs/common';
import { CONNECTION } from './tenancy.symbols';
import { Request as ExpressRequest } from 'express';
import { TenantConnection } from './tenancy-connection';
import { REQUEST } from '@nestjs/core';

const connectionFactory = {
  provide: CONNECTION,
  scope: Scope.REQUEST,
  useFactory: (request: ExpressRequest) => {
    const { tenantId } = request;
    if (tenantId) {
      return TenantConnection.getInstance().getConnection(tenantId);
    }
    return null;
  },
  inject: [REQUEST],
};

@Global()
@Module({
  providers: [connectionFactory],
  exports: [CONNECTION],
})
export class TenancyModuleModule { }
