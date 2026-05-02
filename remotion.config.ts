import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setEntryPoint('src/index.ts');
Config.setConcurrency(1);
Config.setChromiumOpenGlRenderer('angle');
Config.setOverwriteOutput(true);
