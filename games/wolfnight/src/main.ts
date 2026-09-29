import { createStrings } from '@feedplay/engine';
import { bootScoreAttack } from '@feedplay/template-score-attack';
import config from '../game.config.json';
import strings from '../strings.json';
import { createWolfNight } from './game.ts';

void bootScoreAttack({ game: createWolfNight(config, createStrings(strings)), strings });
