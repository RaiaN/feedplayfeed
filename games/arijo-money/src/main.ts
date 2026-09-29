import { createStrings } from '@feedplay/engine';
import { createDuoGame, type DuoConfig, type Situation } from '@feedplay/template-duo-balance';
import base from '@feedplay/template-duo-balance/strings.base.json';
import { bootScoreAttack } from '@feedplay/template-score-attack';
import config from '../game.config.json';
import situation from '../situation.json';
import own from '../strings.json';
import { drawProps, palette } from './props.ts';

const strings = { ...base, ...own };
const game = createDuoGame({
  slug: 'arijo-money',
  config: config as DuoConfig,
  situation: situation as Situation,
  strings: createStrings(strings),
  palette,
  drawProps,
});
void bootScoreAttack({ game, strings });
