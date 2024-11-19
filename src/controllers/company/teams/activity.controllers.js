// Utils
const logger = require('../../../../../cadence-support-brain/src/utils/winston');
const {
  successResponse,
  serverErrorResponse,
  badRequestResponse,
} = require('../../../../../cadence-support-brain/src/utils/response');

// Helper
const ActivityHelper = require('../../../../../cadence-support-brain/src/helper/activity');

const fetchActivity = async (req, res) => {
  try {
    const { limit, offset, search } = req.query;
    const { user_id } = req.params;
    if (!user_id) return badRequestResponse(res, 'User id not specified');
    if (!limit) return badRequestResponse(res, `Limit not specified.`);

    if (parseInt(limit) + parseInt(offset) > 200)
      return badRequestResponse(res, `Limit exceeded.`);

    const fetchLimit = parseInt(limit) + parseInt(offset);

    let cadenceId = null;
    let leadId = null;
    let activityId = null;
    let mailId = null;
    let activitySearch = null;

    if (search) {
      let filter = search.split(':');
      if (filter[0] === 'cadence_id') cadenceId = filter[1];
      else if (filter[0] === 'lead_id') leadId = parseInt(filter[1]);
      else if (filter[0] === 'activity_id') activityId = parseInt(filter[1]);
      else if (filter[0] === 'mail_id') mailId = parseInt(filter[1]);
      else activitySearch = filter;
    }

    const [fetchActivities, errForFetchingActivities] =
      await ActivityHelper.fetchUsersActivity({
        user_id,
        cadenceId,
        leadId,
        activityId,
        mailId,
        activitySearch,
        limit,
        offset,
      });
    if (errForFetchingActivities)
      return serverErrorResponse(res, errForFetchingActivities);

    return successResponse(
      res,
      'User activities fetched successfully',
      fetchActivities
    );
  } catch (err) {
    logger.error(`Error while fetching user activity: `, err);
    return serverErrorResponse(res, 'Error while fetching user activity');
  }
};

const activityController = {
  fetchActivity,
};

module.exports = activityController;
