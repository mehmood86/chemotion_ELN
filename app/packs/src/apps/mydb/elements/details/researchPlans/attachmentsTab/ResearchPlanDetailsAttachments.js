import Dropzone from 'react-dropzone';
import EditorFetcher from 'src/fetchers/EditorFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ImageModal from 'src/components/common/ImageModal';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import SpinnerPencilIcon from 'src/components/common/SpinnerPencilIcon';
import ImageAnnotationModalSVG from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationModalSVG';
import ImageAnnotationEditButton from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationEditButton';
import Utils from 'src/utilities/Functions';
import {
  Button, ButtonGroup,
  Col, ControlLabel,
  FormGroup,
  Glyphicon,
  ListGroup, ListGroupItem,
  Overlay, OverlayTrigger,
  Row,
  Tooltip
} from 'react-bootstrap';
import { last, findKey, values } from 'lodash';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import ImageAttachmentFilter from 'src/utilities/ImageAttachmentFilter';
import SaveResearchPlanWarning from 'src/apps/mydb/elements/details/researchPlans/SaveResearchPlanWarning';

const editorTooltip = (exts) => (
  <Tooltip id="editor_tooltip">
    Available extensions:
    {' '}
    {exts}
  </Tooltip>
);
const downloadTooltip = <Tooltip id="download_tooltip">Download original attachment</Tooltip>;
const downloadAnnotationTooltip = <Tooltip id="download_tooltip">Download annotated attachment</Tooltip>;

const imageStyle = { position: 'absolute', width: 60, height: 60 };

export default class ResearchPlanDetailsAttachments extends Component {
  static isImageFile(fileName) {
    const acceptedImageTypes = ['png', 'jpg', 'bmp', 'tif', 'svg', 'jpeg', 'tiff'];
    const dataType = last(fileName.split('.'));
    return acceptedImageTypes.includes(dataType);
  }

  static renderDownloadAnnotatedImageButton(attachment) {
    if (!ResearchPlanDetailsAttachments.isImageFile(attachment.filename)) {
      return null;
    }
    return (
      <OverlayTrigger placement="top" overlay={downloadAnnotationTooltip}>
        <div className="research-plan-attachments-annotation-download">
          <Button
            bsSize="xsmall"
            className="button-right"
            bsStyle="primary"
            disabled={attachment.isNew}
            onClick={() => {
              Utils.downloadFile({
                contents: `/api/v1/attachments/${attachment.id}/annotated_image`,
                name: attachment.filename
              });
            }}
          >
            <i className="fa fa-download" aria-hidden="true" />
          </Button>
        </div>
      </OverlayTrigger>
    );
  }

  constructor(props) {
    super(props);
    this.importButtonRefs = [];

    this.state = {
      attachmentEditor: false,
      extension: null,
      imageEditModalShown: false,
      showImportConfirm: [],
    };
    this.editorInitial = this.editorInitial.bind(this);
    this.createAttachmentPreviews = this.createAttachmentPreviews.bind(this);
  }

  componentDidMount() {
    this.editorInitial();
    this.createAttachmentPreviews();
  }

  componentDidUpdate(prevProps) {
    const { attachments } = this.props;
    if (attachments !== prevProps.attachments) {
      this.createAttachmentPreviews();
    }
  }

  /* eslint-disable no-param-reassign */
  handleEdit(attachment) {
    const fileType = last(attachment.filename.split('.'));
    const docType = this.documentType(attachment.filename);

    EditorFetcher.startEditing({ attachment_id: attachment.id })
      .then((result) => {
        if (result.token) {
          const url = `/editor?id=${attachment.id}&docType=${docType}
          &fileType=${fileType}&title=${attachment.filename}&key=${result.token}
          &only_office_token=${result.only_office_token}`;
          window.open(url, '_blank');

          attachment.aasm_state = 'oo_editing';
          attachment.updated_at = new Date();

          this.props.onEdit(attachment);
        } else {
          alert('Unauthorized to edit this file.');
        }
      });
  }
  /* eslint-enable no-param-reassign */

  onImport(attachment) {
    const { researchPlan, onAttachmentImportComplete } = this.props;
    const researchPlanId = researchPlan.id;
    LoadingActions.start();
    ElementActions.importTableFromSpreadsheet(
      researchPlanId,
      attachment.id,
      onAttachmentImportComplete
    );
    LoadingActions.stop();
  }

  /* eslint-disable no-param-reassign */
  createAttachmentPreviews() {
    const { attachments } = this.props;
    attachments.map((attachment) => {
      if (attachment.thumb) {
        AttachmentFetcher.fetchThumbnail({ id: attachment.id }).then(
          (result) => {
            if (result != null) {
              attachment.preview = `data:image/png;base64,${result}`;
              this.forceUpdate();
            }
          }
        );
      } else {
        attachment.preview = '/images/wild_card/not_available.svg';
        this.forceUpdate();
      }
      return attachment;
    });
  }
  /* eslint-enable no-param-reassign */

  documentType(filename) {
    const { extension } = this.state;

    const ext = last(filename.split('.'));
    const docType = findKey(extension, (o) => o.includes(ext));

    if (typeof docType === 'undefined' || !docType) {
      return null;
    }

    return docType;
  }

  editorInitial() {
    EditorFetcher.initial().then((result) => {
      this.setState({
        attachmentEditor: result.installed,
        extension: result.ext,
      });
    });
  }

  showImportConfirm(attachmentId) {
    const { showImportConfirm } = this.state;
    showImportConfirm[attachmentId] = true;
    this.setState({ showImportConfirm });
  }

  hideImportConfirm(attachmentId) {
    const { showImportConfirm } = this.state;
    showImportConfirm[attachmentId] = false;
    this.setState({ showImportConfirm });
  }

  confirmAttachmentImport(attachment) {
    this.onImport(attachment);
    this.hideImportConfirm(attachment.id);
  }

  renderRemoveAttachmentButton(attachment) {
    const { onDelete, readOnly } = this.props;
    return (
      <Button
        bsSize="xsmall"
        bsStyle="danger"
        className="button-right"
        onClick={() => onDelete(attachment)}
        disabled={readOnly}
      >
        <i className="fa fa-trash-o" aria-hidden="true" />
      </Button>
    );
  }

  renderImageEditModal() {
    const { choosenAttachment, imageEditModalShown } = this.state;
    const { onEdit } = this.props;
    return (
      <ImageAnnotationModalSVG
        attachment={choosenAttachment}
        isShow={imageEditModalShown}
        handleSave={
          () => {
            const newAnnotation = document.getElementById('svgEditId').contentWindow.svgEditor.svgCanvas.getSvgString();
            choosenAttachment.updatedAnnotation = newAnnotation;
            this.setState({ imageEditModalShown: false });
            onEdit(choosenAttachment);
          }
        }
        handleOnClose={() => { this.setState({ imageEditModalShown: false }); }}
      />
    );
  }

  renderAnnotateImageButton(attachment) {
    return (
      <ImageAnnotationEditButton
        parent={this}
        attachment={attachment}
        horizontalAlignment="button-right"
      />
    );
  }

  renderListGroupItem(attachment) {
    const { attachmentEditor, extension } = this.state;
    const { onUndoDelete } = this.props;

    const updateTime = new Date(attachment.updated_at);
    updateTime.setTime(updateTime.getTime() + 15 * 60 * 1000);

    const hasPop = false;
    const fetchNeeded = false;
    const fetchId = attachment.id;
    const isEditing = attachment.aasm_state === 'oo_editing'
      && new Date().getTime() < updateTime;

    const docType = this.documentType(attachment.filename);
    const editDisable = !attachmentEditor || isEditing || attachment.is_new || docType === null;
    const styleEditorBtn = !attachmentEditor || docType === null ? 'none' : '';
    const isAnnotationUpdated = attachment.updatedAnnotation;
    if (attachment.is_deleted) {
      return (
        <div>
          <Row>
            <Col md={1} />
            <Col md={9}>
              <strike>{attachment.filename}</strike>
            </Col>
            <Col md={2}>
              <Button
                bsSize="xsmall"
                bsStyle="danger"
                className="button-right"
                onClick={() => onUndoDelete(attachment)}
              >
                <i className="fa fa-undo" aria-hidden="true" />
              </Button>
            </Col>
          </Row>
        </div>
      );
    }

    return (
      <div>
        <SaveResearchPlanWarning visible={isAnnotationUpdated} />
        <Row>
          <Col md={1}>
            <div className="analysis-header order" style={{ width: '60px', height: '60px' }}>
              <div className="preview" style={{ width: '60px', height: '60px' }}>
                <ImageModal
                  imageStyle={imageStyle}
                  hasPop={hasPop}
                  previewObject={{
                    src: attachment.preview,
                  }}
                  popObject={{
                    title: attachment.filename,
                    src: attachment.preview,
                    fetchNeeded,
                    fetchId,
                  }}
                />
              </div>
            </div>
          </Col>
          <Col md={8}>{attachment.filename}</Col>
          <Col md={3}>
            {this.renderRemoveAttachmentButton(attachment)}
            {this.renderDownloadOriginalButton(attachment)}
            {this.renderEditAttachmentButton(
              attachment,
              extension,
              attachmentEditor,
              isEditing,
              styleEditorBtn,
              styleEditorBtn,
              editDisable
            )}
            {ResearchPlanDetailsAttachments.renderDownloadAnnotatedImageButton(attachment)}
            {this.renderAnnotateImageButton(attachment)}
            {this.renderImportAttachmentButton(attachment)}
          </Col>
        </Row>
      </div>
    );
  }

  renderEditAttachmentButton(attachment, extension, attachmentEditor, isEditing, styleEditorBtn, editDisable) {
    return (
      <OverlayTrigger placement="left" overlay={editorTooltip(values(extension).join(','))}>
        <Button
          style={{ display: styleEditorBtn }}
          bsSize="xsmall"
          className="button-right"
          bsStyle="success"
          disabled={editDisable}
          onClick={() => this.handleEdit(attachment)}
        >

          <SpinnerPencilIcon spinningLock={!attachmentEditor || isEditing} />
        </Button>
      </OverlayTrigger>

    );
  }

  renderDownloadOriginalButton(attachment) {
    const { onDownload } = this.props;
    return (
      <OverlayTrigger placement="top" overlay={downloadTooltip}>
        <Button
          bsSize="xsmall"
          className="button-right"
          bsStyle="primary"
          onClick={() => onDownload(attachment)}
        >
          <i className="fa fa-download" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }

  renderAttachments() {
    const { attachments, researchPlan } = this.props;
    if (attachments && attachments.length > 0) {
      const filter = new ImageAttachmentFilter();
      const filteredAttachments = filter.filterAttachmentsWhichAreInBody(
        researchPlan.body,
        researchPlan.attachments
      );

      return (
        <ListGroup>
          {filteredAttachments.map((attachment) => (
            <ListGroupItem key={attachment.id}>
              {this.renderListGroupItem(attachment)}
            </ListGroupItem>
          ))}
        </ListGroup>
      );
    }
    return (
      <div>
        There are currently no attachments.
        <br />
      </div>
    );
  }

  renderDropzone() {
    const { onDrop, readOnly } = this.props;
    return (
      <Dropzone
        onDrop={(files) => onDrop(files)}
        className={`research-plan-dropzone-${readOnly ? 'disable' : 'enable'}`}
      >
        <div className="zone">Drop Files, or Click to Select.</div>
      </Dropzone>
    );
  }

  renderImportAttachmentButton(attachment) {
    const { showImportConfirm } = this.state;
    const { researchPlan } = this.props;
    const show = showImportConfirm[attachment.id];
    // TODO: import disabled when?
    const importDisabled = researchPlan.changed;
    const extension = last(attachment.filename.split('.'));

    const importTooltip = importDisabled
      ? <Tooltip id="import_tooltip">Research Plan must be saved before import</Tooltip>
      : <Tooltip id="import_tooltip">Import spreadsheet as research plan table</Tooltip>;

    const confirmTooltip = (
      <Tooltip placement="bottom" className="in" id="tooltip-bottom">
        Import data from Spreadsheet?
        <br />
        <ButtonGroup>
          <Button
            bsStyle="success"
            bsSize="xsmall"
            onClick={() => this.confirmAttachmentImport(attachment)}
          >
            Yes
          </Button>
          <Button
            bsStyle="warning"
            bsSize="xsmall"
            onClick={() => this.hideImportConfirm(attachment.id)}
          >
            No
          </Button>
        </ButtonGroup>
      </Tooltip>
    );

    if (extension === 'xlsx') {
      return (
        <div>
          <OverlayTrigger placement="top" overlay={importTooltip}>
            <div style={{ float: 'right' }}>
              <Button
                bsSize="xsmall"
                bsStyle="success"
                className="button-right"
                disabled={importDisabled}
                ref={(ref) => {
                  this.importButtonRefs[attachment.id] = ref;
                }}
                style={importDisabled ? { pointerEvents: 'none' } : {}}
                onClick={() => this.showImportConfirm(attachment.id)}
              >
                <Glyphicon glyph="import" />
              </Button>
            </div>
          </OverlayTrigger>
          <Overlay
            show={show}
            placement="bottom"
            rootClose
            onHide={() => this.hideImportConfirm(attachment.id)}
            target={this.importButtonRefs[attachment.id]}
          >
            {confirmTooltip}
          </Overlay>
        </div>
      );
    }
    return true;
  }

  render() {
    return (
      <Row>
        <Col md={12}>
          <FormGroup>
            <ControlLabel>Files</ControlLabel>
            {this.renderImageEditModal()}
            {this.renderAttachments()}
            {this.renderDropzone()}
          </FormGroup>
        </Col>
      </Row>
    );
  }
}

ResearchPlanDetailsAttachments.propTypes = {
  researchPlan: PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
    changed: PropTypes.bool.isRequired,
    body: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
      })
    ).isRequired,
    attachments: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        aasm_state: PropTypes.string.isRequired,
        content_type: PropTypes.string.isRequired,
        filename: PropTypes.string.isRequired,
        filesize: PropTypes.number.isRequired,
        identifier: PropTypes.string.isRequired,
        thumb: PropTypes.bool.isRequired
      })
    )
  }).isRequired,
  attachments: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    aasm_state: PropTypes.string.isRequired,
    content_type: PropTypes.string.isRequired,
    filename: PropTypes.string.isRequired,
    filesize: PropTypes.number.isRequired,
    identifier: PropTypes.string.isRequired,
    thumb: PropTypes.bool.isRequired
  })),
  onDrop: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUndoDelete: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onAttachmentImportComplete: PropTypes.func,
  onEdit: PropTypes.func.isRequired,
  readOnly: PropTypes.bool.isRequired
};

ResearchPlanDetailsAttachments.defaultProps = {
  attachments: [],
  onAttachmentImportComplete: () => { }
};
