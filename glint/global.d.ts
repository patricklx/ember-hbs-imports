import { DirectInvokable, EmptyObject } from '@glint/template/-private/integration';
import Registry from '@glint/environment-ember-loose/registry';

declare module '@glint/environment-ember-loose/registry' {
  type helper = DirectInvokable<{
    <T extends keyof Registry>(args: EmptyObject, value: T): Registry[T]
  }>;
  export default interface Registry {
    helper: helper;
    modifier: helper;
  }
}
