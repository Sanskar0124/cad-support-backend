// Utils
const logger = require('../../../../../cadence-support-brain/src/utils/winston');
const {
  successResponse,
  serverErrorResponse,
  badRequestResponse,
} = require('../../../../../cadence-support-brain/src/utils/response');

// Repositories
const LeadRepository = require('../../../../../cadence-support-brain/src/repository/lead.repository');

// Helpers and services
const LeadHelper = require('../../../../../cadence-support-brain/src/helper/lead');

// Joi validation
const TeamsSchema = require('../../../joi/company/teams');

const fetchAllLeads = async (req, res) => {
  try {
    const { limit, offset } = req.query;

    const { error, value } = TeamsSchema.fetchLeadsSchema.validate(req.body);
    if (error) return badRequestResponse(res, error.message);

    let [leadFilters, errForLeadFilters] = LeadHelper.getLeadsListFilter(
      value.tag,
      value.user_id,
      value.search
    );
    if (errForLeadFilters) return serverErrorResponse(res, errForLeadFilters);

    let extrasQuery = {};

    if (limit) extrasQuery.limit = parseInt(limit);
    if (offset) extrasQuery.offset = parseInt(offset);

    extrasQuery.order = [['created_at', 'DESC']];

    const [leads, errForLeads] = await LeadRepository.getLeadsForLeadsListView(
      leadFilters, // query object
      {
        // attributes object
        lead: {
          attributes: ['lead_id', 'duplicate', 'status', 'created_at'],
        },
        account: { attributes: ['account_id'] },
        leadToCadence: { attributes: ['status'] },
        cadence: { attributes: ['cadence_id', 'name', 'status'] },
        node: { attributes: ['node_id'] },
        activity: {
          attributes: [
            'type',
            'name',
            'status',
            'read',
            'incoming',
            'created_at',
          ],
        },
      },
      extrasQuery
    );
    if (errForLeads) return serverErrorResponse(res, errForLeads);

    return successResponse(res, `Leads fetched successfully for user.`, leads);
  } catch (err) {
    logger.error(`Error while fetching leads: `, err);
    return serverErrorResponse(
      res,
      `Error while fetching leads: ${err.message}`
    );
  }
};

const leadControllers = {
  fetchAllLeads,
};

module.exports = leadControllers;
