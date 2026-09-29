import { createStrings } from '@feedplay/engine';
import { bootScoreAttack } from '@feedplay/template-score-attack';
import config from '../game.config.json';
import strings from '../strings.json';
import { createLittleMoments } from './game.ts';

void bootScoreAttack({ game: createLittleMoments(config, createStrings(strings)), strings });
