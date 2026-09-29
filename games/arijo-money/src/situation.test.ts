import type { DuoConfig, Situation } from '@feedplay/template-duo-balance';
import base from '@feedplay/template-duo-balance/strings.base.json';
import { runSituationSuite } from '@feedplay/template-duo-balance/suite';
import config from '../game.config.json';
import situation from '../situation.json';
import own from '../strings.json';

runSituationSuite('Money Talk', config as DuoConfig, situation as Situation, { ...base, ...own });
