import { createStrings } from '@feedplay/engine';
import { bootScoreAttack } from '@feedplay/template-score-attack';
import config from '../game.config.json';
import strings from '../strings.json';
import { createFloodLine } from './game.ts';

void bootScoreAttack({ game: createFloodLine(config, createStrings(strings)), strings });
