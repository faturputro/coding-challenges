import { Controller, ChildControllers } from '@overnightjs/core';
import QuizSessionControllerV1 from './QuizSession.v1';
import servicesContainers from '@server/services/services.containers';
import AuthControllerV1 from './Auth.v1';
import PlayerSessionControllerV1 from './PlayerSession.v1';

@Controller('api/v1')
@ChildControllers([
  new AuthControllerV1(servicesContainers.adminAuthService),
  new QuizSessionControllerV1(servicesContainers.quizSessionService),
  new PlayerSessionControllerV1(servicesContainers.quizSessionService, servicesContainers.quizPlayService),
])
export default class ControllerV1 {}
