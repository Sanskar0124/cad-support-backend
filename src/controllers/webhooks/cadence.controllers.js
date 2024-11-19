// Utils
const logger = require('../../../../cadence-support-brain/src/utils/winston');
const {
  successResponse,
  serverErrorResponse,
} = require('../../../../cadence-support-brain/src/utils/response');
const { DB_TABLES } = require('../../../../Cadence-Brain/src/utils/modelEnums');
const SocketHelper = require('../../utils/socket');

//Repository
const Repository = require('../../../../cadence-support-brain/src/repository');

const createCompany = async (req, res) => {
  try {
    logger.info('New Activity Created from Webhook');
    const activityObj = {
      name: req.body.name,
      type: 'incoming',
      comment: req.body.comment,
      status: req.body.status,
      lead_id: 0,
    };
    const [newActivity, errForNewActivity] = await Repository.create({
      tableName: DB_TABLES.ACTIVITY,
      createObject: activityObj,
    });
    if (errForNewActivity) return serverErrorResponse(res, errForNewActivity);

    let [activity, errForActivity] = await Repository.fetchOne({
      tableName: DB_TABLES.ACTIVITY,
      query: {
        activity_id: newActivity.activity_id,
      },
      extras: {
        attributes: [
          'activity_id',
          'name',
          'type',
          'status',
          'comment',
          'created_at',
        ],
      },
    });
    if (errForActivity)
      return serverErrorResponse(res, `Error while fetching activity.`);

    // Sending activity to client through websocket
    SocketHelper.sendActivity(activity);
    return successResponse(res, 'New Activity has been created.');
  } catch (err) {
    return serverErrorResponse(res, err.message);
  }
};

const CadenceController = {
  createCompany,
};

module.exports = CadenceController;
