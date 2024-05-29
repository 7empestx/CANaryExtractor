#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkStack } from "../lib/cdk-stack";
import { stageConfig } from "./config";

const app = new cdk.App();
new CdkStack(app, "TrendBitAlphaStack", stageConfig.alpha);
//new CdkStack(app, "VozAmigoBetaStack", stageConfig.beta);
//new CdkStack(app, "VozAmigoProdStack", stageConfig.prod);
