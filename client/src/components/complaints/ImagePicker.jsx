import { App, Upload } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { MAX_IMAGE_MB, MAX_IMAGES } from '../../utils/constants';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Controlled image picker; files are sent with the form, not uploaded on select. */
export default function ImagePicker({ value = [], onChange, max = MAX_IMAGES }) {
  const { message } = App.useApp();

  const beforeUpload = (file) => {
    if (!ACCEPT.includes(file.type)) {
      message.error(`${file.name}: only JPG, PNG, WEBP or GIF images are allowed`);
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      message.error(`${file.name} is larger than ${MAX_IMAGE_MB} MB`);
      return Upload.LIST_IGNORE;
    }
    return false; // keep locally; the parent submits it
  };

  return (
    <Upload
      listType="picture-card"
      accept={ACCEPT.join(',')}
      multiple
      fileList={value}
      beforeUpload={beforeUpload}
      onChange={({ fileList }) => onChange?.(fileList.slice(0, max))}
      onPreview={(f) => {
        const url = f.url || (f.originFileObj && URL.createObjectURL(f.originFileObj));
        if (url) window.open(url, '_blank', 'noopener');
      }}
    >
      {value.length < max && (
        <button type="button" className="flex cursor-pointer flex-col items-center gap-1 border-0 bg-transparent" style={{ font: 'inherit' }}>
          <PlusOutlined />
          <span className="text-xs">Add photo</span>
        </button>
      )}
    </Upload>
  );
}
